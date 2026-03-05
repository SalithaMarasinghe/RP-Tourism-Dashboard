"""
tourism_rag.py
~~~~~~~~~~~~~
RAG-based Tourism Data Assistant service.
Implements hybrid retrieval combining semantic search and BM25 keyword search.
"""
import logging
import os
import pickle
import re
from typing import Any, Dict, List, Optional

import chromadb
import numpy as np
from rank_bm25 import BM25Okapi
from fastapi import HTTPException
from langchain_chroma import Chroma
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

# Set up logger
logger = logging.getLogger(__name__)

class LightweightONNXEmbeddings:
    def __init__(self):
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
        self.ef = DefaultEmbeddingFunction()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.ef(texts)

    def embed_query(self, text: str) -> list[float]:
        return self.ef([text])[0]


# Global variables for loaded models and databases
_embedding_model = None
_chroma_client = None
_chroma_collection = None
_bm25_index = None
_corpus_documents = None
_vector_store = None


def initialize_rag_system():
    """Initialize RAG system by loading models and databases."""
    global _embedding_model, _chroma_client, _chroma_collection, _bm25_index, _corpus_documents, _vector_store
    
    try:
        # Load lightweight ONNX embedding model
        logger.debug("Loading lightweight ONNX embedding model...")
        try:
            _embedding_model = LightweightONNXEmbeddings()
            logger.debug("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
        
        # Load Chroma DB using the same method as your indexing script
        logger.debug("Loading Chroma database using LangChain...")
        chroma_path = os.path.join(os.path.dirname(__file__), '..', 'vector database', 'chroma_tourism_db')
        
        try:
            # Use the exact same approach as your indexing script
            _vector_store = Chroma(
                persist_directory=chroma_path,
                embedding_function=_embedding_model,
                collection_name="langchain"
            )
            
            # Also get direct access to the collection for metadata
            _chroma_client = chromadb.PersistentClient(path=chroma_path)
            _chroma_collection = _chroma_client.get_collection("langchain")
            logger.debug("Chroma collection retrieved successfully")
        except Exception as e:
            logger.error(f"Failed to load Chroma database: {e}")
            raise
        
        # Load BM25 index (optimized loading with compatibility fallback)
        logger.debug("Loading BM25 index...")
        try:
            bm25_path = os.path.join(os.path.dirname(__file__), '..', 'vector database', 'bm25_index.pkl')
            logger.debug(f"BM25 path: {bm25_path}")
            
            with open(bm25_path, 'rb') as f:
                bm25_data = pickle.load(f)
                _bm25_index = bm25_data[0]  # BM25 index is first element
                # Extract documents from second element (could be list or Document objects)
                documents_data = bm25_data[1]
                if hasattr(documents_data[0], 'page_content'):
                    # LangChain Document objects
                    _corpus_documents = [doc.page_content for doc in documents_data]
                else:
                    # Plain strings
                    _corpus_documents = documents_data
                logger.info(f"BM25 loaded successfully with {len(_corpus_documents)} documents")
        except Exception as bm25_error:
            logger.warning(f"Failed to load BM25 index with standard method: {bm25_error}")
            # Try alternative loading methods
            try:
                with open(bm25_path, 'rb') as f:
                    bm25_data = pickle.load(f, encoding='latin1')
                    _bm25_index = bm25_data[0]
                    documents_data = bm25_data[1]
                    if hasattr(documents_data[0], 'page_content'):
                        _corpus_documents = [doc.page_content for doc in documents_data]
                    else:
                        _corpus_documents = documents_data
                logger.info("Successfully loaded BM25 with latin1 encoding")
            except Exception as alt_error:
                logger.error(f"Failed to load BM25 index with all methods: {alt_error}")
                # Create a fallback BM25 index if loading fails
                logger.warning("Creating fallback BM25 index - this may reduce search quality")
                _bm25_index = None
                _corpus_documents = []
        
        logger.info("RAG system initialized successfully with lightweight ONNX embeddings")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return False


def hybrid_retrieval(query: str, top_k: int = 12) -> List[Dict[str, Any]]:
    """
    Perform enhanced hybrid retrieval with metadata-driven filtering.
    Implements year targeting, content type prioritization, and expert-level relevance scoring.
    
    Args:
        query: User query string
        top_k: Number of top results to return
        
    Returns:
        List of retrieved chunks with enhanced scoring and metadata filtering
    """
    # Check if essential components are available (BM25 is optional)
    if not all([_embedding_model, _chroma_collection]):
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    # Handle BM25 being None (fallback to semantic-only search)
    bm25_available = _bm25_index is not None and _corpus_documents is not None
    
    try:
        # Extract years from query for metadata targeting
        query_years = re.findall(r'\b(20\d{2})\b', query)
        target_year = query_years[0] if query_years else None
        
        # Detect query type for content type prioritization
        is_numerical_query = bool(re.search(r'\b\d+\b', query))
        is_table_query = any(term in query.lower() for term in ['table', 'data', 'statistics', 'figures', 'numbers'])
        
        # 1. Enhanced semantic search with metadata filtering using LangChain Chroma
        query_embedding = _embedding_model.embed_query(query)
        
        # Use LangChain Chroma for similarity search
        semantic_docs = _vector_store.similarity_search_with_score(query, k=min(top_k * 4, 40))
        
        # Convert LangChain results to expected format
        semantic_results = {
            'documents': [[doc.page_content for doc, score in semantic_docs]],
            'distances': [[score for doc, score in semantic_docs]],
            'metadatas': [[doc.metadata for doc, score in semantic_docs]]
        }
        
        # 2. BM25 keyword search (if available)
        if bm25_available:
            tokenized_query = query.lower().split()
            bm25_scores = _bm25_index.get_scores(tokenized_query)
        else:
            # Fallback: create dummy scores (all zeros) for semantic-only search
            logger.warning("BM25 not available, using semantic-only search")
            bm25_scores = [0.0] * len(semantic_results['documents'][0]) if semantic_results['documents'] else [0.0]
        
        # 3. Enhanced results combination with metadata filtering
        combined_results = []
        
        # Process semantic results with metadata filtering
        semantic_docs = semantic_results['documents'][0] if semantic_results['documents'] else []
        semantic_distances = semantic_results['distances'][0] if semantic_results['distances'] else []
        semantic_metadatas = semantic_results['metadatas'][0] if semantic_results['metadatas'] else []
        
        # Create mapping from document content to semantic info
        semantic_map = {}
        for i, doc in enumerate(semantic_docs):
            if i < len(semantic_distances) and i < len(semantic_metadatas):
                doc_str = str(doc) if hasattr(doc, 'page_content') else doc
                metadata = semantic_metadatas[i]
                
                # Apply metadata filtering
                semantic_score = 1 - semantic_distances[i]
                
                # Year targeting boost
                if target_year and metadata.get('year') == int(target_year):
                    semantic_score *= 1.5  # Strong boost for exact year match
                elif target_year and metadata.get('year'):
                    year_diff = abs(int(metadata.get('year')) - int(target_year))
                    if year_diff <= 2:  # Close years get smaller boost
                        semantic_score *= 1.1
                
                # Content type prioritization
                content_type = metadata.get('content_type', '')
                if is_table_query and content_type == 'table':
                    semantic_score *= 1.3  # Boost table content for data queries
                elif is_numerical_query and metadata.get('numeric_heavy', False):
                    semantic_score *= 1.4  # Boost numeric-heavy content
                
                semantic_map[doc_str] = {
                    'semantic_score': semantic_score,
                    'metadata': metadata
                }
        
        # Process BM25 results with enhanced scoring (if available)
        if bm25_available and _corpus_documents:
            for i, (doc, bm25_score) in enumerate(zip(_corpus_documents, bm25_scores)):
                if bm25_score > 0:
                    doc_str = str(doc) if hasattr(doc, 'page_content') else doc
                    
                    # Get semantic info
                    semantic_info = semantic_map.get(doc_str, {'semantic_score': 0, 'metadata': {}})
                    semantic_score = semantic_info['semantic_score']
                    metadata = semantic_info['metadata']
                    
                    # Normalize BM25 score
                    if len(bm25_scores) > 1 and np.max(bm25_scores) > np.min(bm25_scores):
                        bm25_normalized = (bm25_score - np.min(bm25_scores)) / (np.max(bm25_scores) - np.min(bm25_scores))
                    else:
                        bm25_normalized = bm25_score
                    
                    # Enhanced scoring with metadata considerations
                    base_score = 0.7 * semantic_score + 0.3 * bm25_normalized
                    
                    # Additional metadata-based boosts
                    if target_year and metadata.get('year') == int(target_year):
                        base_score *= 1.4
                    
                    if is_numerical_query and metadata.get('numeric_heavy', False):
                        base_score *= 1.2
                    
                    if is_table_query and metadata.get('content_type') == 'table':
                        base_score *= 1.2
                    
                    combined_results.append({
                        'content': doc_str,
                        'score': base_score,
                        'semantic_score': semantic_score,
                        'bm25_score': bm25_normalized,
                        'metadata': metadata
                    })
        else:
            # Fallback: use only semantic results
            logger.warning("Using semantic-only results due to BM25 unavailability")
            for i, doc in enumerate(semantic_docs):
                if i < len(semantic_distances) and i < len(semantic_metadatas):
                    doc_str = str(doc) if hasattr(doc, 'page_content') else doc
                    metadata = semantic_metadatas[i]
                    semantic_score = 1 - semantic_distances[i]
                    
                    combined_results.append({
                        'content': doc_str,
                        'score': semantic_score,
                        'semantic_score': semantic_score,
                        'bm25_score': 0.0,
                        'metadata': metadata
                    })
        
        # Sort by enhanced score and return top_k
        combined_results.sort(key=lambda x: x['score'], reverse=True)
        return combined_results[:top_k]
        
    except Exception as e:
        logger.error(f"Enhanced hybrid retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")


def extract_numerical_data(context: str) -> Dict[str, Any]:
    """
    Extract numerical data from context for analytical calculations.
    
    Args:
        context: Retrieved context string
        
    Returns:
        Dictionary with extracted numerical data organized by year and metric
    """
    import re
    from typing import Dict, List, Any
    
    numerical_data = {}
    
    # Extract years and associated numerical values
    year_pattern = r'\b(20\d{2})\b'
    number_pattern = r'\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b'
    
    years_in_context = re.findall(year_pattern, context)
    
    for year in years_in_context:
        # Look for numerical data near year mentions
        year_context = re.findall(rf'.{{0,100}}{year}.{{0,200}}', context)
        
        year_data = {
            'tourist_arrivals': [],
            'revenue': [],
            'occupancy_rates': [],
            'employment': [],
            'other_metrics': []
        }
        
        for ctx in year_context:
            numbers = re.findall(number_pattern, ctx)
            
            # Categorize numbers based on context clues
            for num in numbers:
                clean_num = float(num.replace(',', ''))
                
                # Large numbers likely to be arrivals or revenue
                if clean_num > 10000:
                    if 'arrival' in ctx.lower() or 'tourist' in ctx.lower():
                        year_data['tourist_arrivals'].append(clean_num)
                    elif 'revenue' in ctx.lower() or 'earnings' in ctx.lower() or '$' in ctx:
                        year_data['revenue'].append(clean_num)
                    else:
                        year_data['other_metrics'].append(clean_num)
                
                # Percentage values for occupancy rates
                elif '%' in ctx or 'occupancy' in ctx.lower():
                    year_data['occupancy_rates'].append(clean_num)
                
                # Medium numbers for employment
                elif 100 < clean_num < 10000 and ('employment' in ctx.lower() or 'job' in ctx.lower()):
                    year_data['employment'].append(clean_num)
        
        numerical_data[year] = year_data
    
    return numerical_data


def calculate_derived_metrics(numerical_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate derived metrics from extracted numerical data.
    
    Args:
        numerical_data: Extracted numerical data by year
        
    Returns:
        Dictionary with calculated derived metrics
    """
    derived_metrics = {}
    years = sorted(numerical_data.keys())
    
    for i, year in enumerate(years):
        year_data = numerical_data[year]
        metrics = {}
        
        # YoY Growth calculations
        if i > 0:
            prev_year = years[i-1]
            prev_data = numerical_data[prev_year]
            
            # Tourist arrivals YoY growth
            if (year_data['tourist_arrivals'] and prev_data['tourist_arrivals']):
                current_arrivals = max(year_data['tourist_arrivals'])
                prev_arrivals = max(prev_data['tourist_arrivals'])
                if prev_arrivals > 0:
                    yoy_growth = ((current_arrivals - prev_arrivals) / prev_arrivals) * 100
                    metrics['arrivals_yoy_growth'] = round(yoy_growth, 2)
            
            # Revenue YoY growth
            if (year_data['revenue'] and prev_data['revenue']):
                current_revenue = max(year_data['revenue'])
                prev_revenue = max(prev_data['revenue'])
                if prev_revenue > 0:
                    revenue_yoy = ((current_revenue - prev_revenue) / prev_revenue) * 100
                    metrics['revenue_yoy_growth'] = round(revenue_yoy, 2)
        
        # Revenue per tourist
        if (year_data['tourist_arrivals'] and year_data['revenue']):
            arrivals = max(year_data['tourist_arrivals'])
            revenue = max(year_data['revenue'])
            if arrivals > 0:
                metrics['revenue_per_tourist'] = round(revenue / arrivals, 2)
        
        # Employment multiplier
        if (year_data['tourist_arrivals'] and year_data['employment']):
            arrivals = max(year_data['tourist_arrivals'])
            employment = max(year_data['employment'])
            if employment > 0:
                metrics['tourists_per_job'] = round(arrivals / employment, 2)
        
        # Average occupancy rate
        if year_data['occupancy_rates']:
            metrics['avg_occupancy_rate'] = round(sum(year_data['occupancy_rates']) / len(year_data['occupancy_rates']), 2)
        
        if metrics:
            derived_metrics[year] = metrics
    
    return derived_metrics


def format_single_year_dashboard(year: str, numerical_data: Dict[str, Any], derived_metrics: Dict[str, Any], sources: List[str]) -> str:
    """
    Format a comprehensive single-year dashboard.
    
    Args:
        year: Target year
        numerical_data: Extracted numerical data
        derived_metrics: Calculated derived metrics
        sources: Source citations
        
    Returns:
        Formatted dashboard string
    """
    dashboard = f"# 🎯 {year} Tourism Year-in-Review Dashboard\n\n"
    
    year_data = numerical_data.get(year, {})
    metrics = derived_metrics.get(year, {})
    
    # Top Markets section
    if year_data['tourist_arrivals']:
        arrivals = max(year_data['tourist_arrivals'])
        dashboard += f"## 🌍 **Top Markets & Arrivals**\n"
        dashboard += f"- **Total Tourist Arrivals:** {arrivals:,.0f}\n"
        
        if 'arrivals_yoy_growth' in metrics:
            growth = metrics['arrivals_yoy_growth']
            dashboard += f"- **YoY Growth:** {growth:+.2f}%\n"
        
        dashboard += f"\n"
    
    # Economic Impact section
    if year_data['revenue']:
        revenue = max(year_data['revenue'])
        dashboard += f"## 💰 **Economic Impact**\n"
        dashboard += f"- **Total Foreign Exchange Earnings:** ${revenue:,.0f}\n"
        
        if 'revenue_yoy_growth' in metrics:
            revenue_growth = metrics['revenue_yoy_growth']
            dashboard += f"- **Revenue YoY Growth:** {revenue_growth:+.2f}%\n"
        
        if 'revenue_per_tourist' in metrics:
            rev_per_tourist = metrics['revenue_per_tourist']
            dashboard += f"- **Revenue Per Tourist:** ${rev_per_tourist:.2f}\n"
        
        dashboard += f"\n"
    
    # Transport & Logistics section
    dashboard += f"## ✈️ **Transport & Logistics**\n"
    dashboard += f"- **Primary Mode:** Air transport (based on historical patterns)\n"
    dashboard += f"- **Key Arrival Points:** Bandaranaike International Airport\n\n"
    
    # Employment section
    if year_data['employment']:
        employment = max(year_data['employment'])
        dashboard += f"## 👥 **Employment Impact**\n"
        dashboard += f"- **Direct Employment:** {employment:,.0f} jobs\n"
        
        if 'tourists_per_job' in metrics:
            tourists_job = metrics['tourists_per_job']
            dashboard += f"- **Tourists Per Job:** {tourists_job:.0f}\n"
        
        dashboard += f"\n"
    
    # Accommodation section
    if year_data['occupancy_rates']:
        avg_occupancy = metrics.get('avg_occupancy_rate', sum(year_data['occupancy_rates']) / len(year_data['occupancy_rates']))
        dashboard += f"## 🏨 **Accommodation Performance**\n"
        dashboard += f"- **Average Occupancy Rate:** {avg_occupancy:.1f}%\n\n"
    
    # Sources
    if sources:
        dashboard += f"## 📊 **Data Sources**\n"
        for source in sources[:5]:  # Limit to top 5 sources
            dashboard += f"- {source}\n"
    
    return dashboard


def format_multi_year_table(numerical_data: Dict[str, Any], derived_metrics: Dict[str, Any], sources: List[str]) -> str:
    """
    Format multi-year data as chronological markdown table.
    
    Args:
        numerical_data: Extracted numerical data by year
        derived_metrics: Calculated derived metrics by year
        sources: Source citations
        
    Returns:
        Formatted markdown table string
    """
    years = sorted(numerical_data.keys())
    
    if len(years) < 2:
        return "Insufficient multi-year data for trend analysis."
    
    table = "# 📈 Multi-Year Tourism Trends\n\n"
    table += "| Year | Tourist Arrivals | Revenue ($) | YoY Growth (%) | Revenue Per Tourist ($) |\n"
    table += "|------|------------------|-------------|----------------|------------------------|\n"
    
    for year in years:
        year_data = numerical_data[year]
        metrics = derived_metrics.get(year, {})
        
        arrivals = max(year_data['tourist_arrivals']) if year_data['tourist_arrivals'] else 'N/A'
        revenue = max(year_data['revenue']) if year_data['revenue'] else 'N/A'
        yoy_growth = metrics.get('arrivals_yoy_growth', 'N/A')
        rev_per_tourist = metrics.get('revenue_per_tourist', 'N/A')
        
        if arrivals != 'N/A':
            arrivals_str = f"{arrivals:,.0f}"
        else:
            arrivals_str = 'N/A'
            
        if revenue != 'N/A':
            revenue_str = f"${revenue:,.0f}"
        else:
            revenue_str = 'N/A'
            
        if yoy_growth != 'N/A':
            growth_str = f"{yoy_growth:+.2f}"
        else:
            growth_str = 'N/A'
            
        if rev_per_tourist != 'N/A':
            rev_tourist_str = f"${rev_per_tourist:.2f}"
        else:
            rev_tourist_str = 'N/A'
        
        table += f"| {year} | {arrivals_str} | {revenue_str} | {growth_str} | {rev_tourist_str} |\n"
    
    # Add sources section
    if sources:
        table += f"\n## 📊 **Data Sources**\n"
        for source in sources[:5]:
            table += f"- {source}\n"
    
    return table


def build_context(retrieved_chunks: List[Dict[str, Any]]) -> str:
    """
    Build context string from retrieved chunks.
    
    Args:
        retrieved_chunks: List of retrieved chunks with metadata
        
    Returns:
        Formatted context string
    """
    if not retrieved_chunks:
        return "No relevant information found in tourism statistical reports."
    
    context_parts = []
    for i, chunk in enumerate(retrieved_chunks, 1):
        content = chunk['content']
        metadata = chunk.get('metadata', {})
        
        # Extract year from metadata if available
        year = metadata.get('year', 'Unknown')
        source = metadata.get('source', 'Tourism Report')
        
        context_parts.append(f"Source {i} ({source}, {year}):\n{content}")
    
    return "\n\n".join(context_parts)


def generate_rag_response(question: str, context: str) -> str:
    """
    Generate response using LLM with expert tourism data analyst persona.
    Implements strict data extraction, analytical calculations, and structured output.
    
    Args:
        question: User question
        context: Retrieved context from tourism reports
        
    Returns:
        Generated response with expert analysis and proper citations
    """
    import google.generativeai as genai
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        genai.configure(api_key=api_key)
        # Use gemini-2.5-flash-lite as requested
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        
        system_prompt = """# Role: Expert Tourism Data Analyst & Master RAG Context Engineer

## 🎯 Primary Objective
You are an advanced analytical engine powering a Retrieval-Augmented Generation (RAG) system. Your dataset consists of Annual Statistical Reports for Tourism (2010 to 2025) stored in a hybrid vector database (Chroma + BM25). Your goal is to accurately extract, cross-reference, calculate, and present tourism statistics based exclusively on retrieved markdown chunks and table data.

## 🗂️ 1. DATA DICTIONARY (What You Can Extract)
You must actively look for and analyze the following dimensions within the retrieved context:
- **Demographics & Profiling:** Tourist arrivals by Nationality/Region, Age Groups (e.g., 3-19, 20-29), Sex, and Occupational Categories.
- **Logistics & Transport:** Mode of transport (Air vs. Sea), specific ports of arrival, and airline carrier performance (Scheduled vs. Charter).
- **Visit Characteristics:** Purpose of Visit (Pleasure, Business, VFR, Religious, etc.) and Average Duration of Stay (overall and by region).
- **Accommodation & Capacity:** Room supply by region, Star-class breakdowns (1 to 5-star, supplementary), Occupancy Rates, and Guest Nights (Foreign vs. Local).
- **Financial & Economic Impact:** Total Foreign Exchange Earnings, average spending per tourist per day, and Tourist Price Indices.
- **Employment:** Direct and indirect employment figures across sectors (hotels, airlines, tour agencies, guides).
- **Seasonality:** Month-by-month arrival trends and seasonal peak indices.

## ⚙️ 2. RETRIEVAL & CONTEXT PROCESSING RULES (How to Get the Data)
You will receive context chunks that include metadata (`year`, `content_type`, `numeric_heavy`, `source_file`). Apply these strict rules:
- **Metadata Targeting:** Always filter or heavily weigh the `year` metadata to match the user's temporal query. If a user asks for "2015 data", restrict your synthesis to chunks where `year=2015`.
- **Table Reconstruction:** When processing chunks where `content_type=table`, read the table summary provided in the chunk to understand the columns. Reconstruct split tables in your "mind" by aligning headers before answering.
- **Zero Hallucination:** You must NEVER invent numbers. If a specific metric or year is not present in the retrieved context, state explicitly: *"Data for [Metric] in [Year] is not available in the current retrieved context."*

## 🧮 3. ANALYTICAL CALCULATIONS (How to Derive Insights)
Do not just parrot raw data. Whenever relevant, calculate and present derived metrics to add value:
- **Year-over-Year (YoY) Growth:** `((Current Year Value - Previous Year Value) / Previous Year Value) * 100` (Present as +X% or -X%).
- **Market Share / Distribution:** `(Segment Value / Total Value) * 100` (e.g., "Western Europe accounted for 35% of total arrivals").
- **Revenue Per Tourist:** `Total Foreign Exchange Earnings / Total Arrivals`.
- **Employment Multiplier:** `Total Arrivals / Total Employment` (e.g., "1 job sustained per X tourists").
- **Occupancy Discrepancy:** Compare 'Occupancy Rate' with 'Foreign Guest Nights' to deduce local vs. foreign reliance by region.

## 📊 4. OUTPUT & FORMATTING STANDARDS
- **Single-Year Queries:** Output a comprehensive "Year-in-Review" dashboard. Use bold headers for Top Markets, Economic Impact, and Transport.
- **Multi-Year/Trend Queries:** Always output longitudinal data as a chronologically ordered Markdown Table (e.g., `| Year | Metric A | Metric B | YoY Growth |`).
- **Data Citations:** Every single metric or table you provide MUST be followed by an inline citation referencing the metadata. Example: `(Source: 2011.md)` or `(Data from 2015 report)`.
- **Clarity:** Keep narrative text concise. Let the data, tables, and calculated percentages drive the response.

## 🚫 5. ZERO HALLUCINATION PROTOCOL
- NEVER invent or estimate numbers not present in the context
- If data is missing, explicitly state its unavailability
- Always verify calculations can be performed with available data
- When uncertain, state the limitation clearly"""
        
        full_prompt = f"""{system_prompt}

Context from tourism reports:
{context}

User Question: {question}

## 🚫 ZERO HALLUCINATION ENFORCEMENT:
- ONLY use numbers, dates, and facts explicitly present in the context above
- If a specific metric/year is not found, state: "Data for [Metric] in [Year] is not available in the current retrieved context."
- NEVER interpolate or estimate between years unless the context provides the basis
- Every numerical claim must have a corresponding source citation
- When uncertain, explicitly state the limitation

Please provide a comprehensive analysis using ONLY the available data above."""
        
        response = model.generate_content(full_prompt)
        if response and response.text:
            return response.text.strip()
        else:
            raise HTTPException(status_code=500, detail="No response generated from LLM")
            
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        
        # Check if it's a quota/rate limit error
        if "quota" in str(e).lower() or "429" in str(e) or "rate limit" in str(e).lower():
            logger.debug("Gemini API quota exceeded, using fallback response")
            return generate_fallback_response(question, context)
        
        # For other errors, still raise
        raise HTTPException(status_code=500, detail=f"Response generation failed: {str(e)}")


def generate_fallback_response(question: str, context: str) -> str:
    """
    Generate a fallback response without using Gemini API.
    This provides basic responses when the API quota is exceeded.
    
    Args:
        question: User question
        context: Retrieved context from tourism reports
        
    Returns:
        Fallback response
    """
    if not context.strip():
        return "I apologize, but I couldn't find relevant information in the tourism reports to answer your question. The available data might not contain the specific information you're looking for. Please try asking about tourism trends, visitor statistics, or industry insights from 2010-2025."
    
    # Extract key information from context for basic response
    context_lower = context.lower()
    question_lower = question.lower()
    
    # Check for years mentioned
    import re
    years_in_context = re.findall(r'\b(20\d{2})\b', context)
    years_mentioned = list(set(years_in_context)) if years_in_context else ["2010-2025"]
    
    # Check for data types
    has_numbers = bool(re.search(r'\b\d+(?:,\d{3})*(?:\.\d+)?\b', context))
    has_percentages = '%' in context
    has_tourism_terms = any(term in context_lower for term in ['tourist', 'visitor', 'arrival', 'revenue', 'accommodation'])
    
    # Generate contextual response
    if has_numbers and has_tourism_terms:
        if any(year in question_lower for year in years_mentioned):
            return f"Based on the tourism reports I have access to, I found relevant data for {', '.join(years_mentioned[:3])}. The reports contain specific numerical information about tourism statistics. The data includes visitor numbers, revenue figures, and industry trends for Sri Lanka's tourism sector. Please try again later for a more detailed response, or feel free to ask about general tourism trends."
        else:
            return f"I found relevant tourism data in the reports covering {', '.join(years_mentioned[:3])}. The documents contain statistical information about Sri Lanka's tourism industry, including visitor statistics and industry trends. The reports appear to have the specific information you're looking for - please try again shortly for a complete response."
    else:
        return f"I found tourism reports covering the period {', '.join(years_mentioned[:3])}, but I'm currently experiencing issues with detailed analysis. The reports contain information about Sri Lanka's tourism industry. Please try again in a few moments for a comprehensive response to your question about tourism data and statistics."


async def handle_tourism_rag_query(question: str) -> Dict[str, Any]:
    """
    Handle a tourism RAG query with enhanced context engineering.
    Implements expert analysis, structured output, and zero-hallucination safeguards.
    
    Args:
        question: User question
        
    Returns:
        Dictionary with enhanced response and metadata
    """
    try:
        # Initialize RAG system if not already done
        if _embedding_model is None:
            if not initialize_rag_system():
                raise HTTPException(status_code=500, detail="Failed to initialize RAG system")
        
        # Perform enhanced hybrid retrieval
        retrieved_chunks = hybrid_retrieval(question, top_k=15)
        
        # If we don't have enough relevant chunks, try a broader search
        if len(retrieved_chunks) < 8 or all(chunk.get('score', 0) < 0.3 for chunk in retrieved_chunks):
            logger.info("Low relevance results, performing broader search")
            broader_query = question + " tourism statistics data"
            additional_chunks = hybrid_retrieval(broader_query, top_k=10)
            
            # Combine and deduplicate
            seen_contents = set(chunk.get('content', '') for chunk in retrieved_chunks)
            for chunk in additional_chunks:
                if chunk.get('content', '') not in seen_contents:
                    retrieved_chunks.append(chunk)
            
            # Re-sort by score and keep top 15
            retrieved_chunks.sort(key=lambda x: x.get('score', 0), reverse=True)
            retrieved_chunks = retrieved_chunks[:15]
        
        # Build enhanced context
        context = build_context(retrieved_chunks)
        
        # Extract numerical data for analysis
        numerical_data = extract_numerical_data(context)
        derived_metrics = calculate_derived_metrics(numerical_data)
        
        # Extract sources from metadata
        sources = []
        for chunk in retrieved_chunks:
            metadata = chunk.get('metadata', {})
            if 'source' in metadata:
                source_info = f"{metadata['source']}"
                if 'year' in metadata:
                    source_info += f" ({metadata['year']})"
                sources.append(source_info)
        
        # Detect query type for appropriate formatting
        query_years = re.findall(r'\b(20\d{2})\b', question)
        is_single_year = len(query_years) == 1
        is_multi_year = len(query_years) > 1 or 'trend' in question.lower() or 'compare' in question.lower()
        
        # Generate expert response
        response = generate_rag_response(question, context)
        
        # Check if we should add structured formatting
        if is_single_year and query_years[0] in numerical_data:
            # Add single-year dashboard
            dashboard = format_single_year_dashboard(query_years[0], numerical_data, derived_metrics, sources)
            response = f"{response}\n\n{dashboard}"
        elif is_multi_year and len(numerical_data) >= 2:
            # Add multi-year table
            table = format_multi_year_table(numerical_data, derived_metrics, sources)
            response = f"{response}\n\n{table}"
        
        return {
            "response": response,
            "sources": list(set(sources)),  # Remove duplicates
            "chunks_used": len(retrieved_chunks),
            "context_available": len(retrieved_chunks) > 0,
            "numerical_data": numerical_data,
            "derived_metrics": derived_metrics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced tourism RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


# Initialize the RAG system when the module is imported
initialize_rag_system()
