"""
tourism_rag.py
~~~~~~~~~~~~~
RAG-based Tourism Data Assistant service.
Implements Query Rewriting, Synonym Dragnets, Dynamic Range Expansion, 
Domain Guardrails, Context Deduplication, and Balanced Concept Scoring.
"""
import logging
import os
import pickle
import re
from typing import Any, Dict, List

import chromadb
import numpy as np
from fastapi import HTTPException
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

# Global variables
_embedding_model = None
_chroma_client = None
_chroma_collection = None
_bm25_index = None
_corpus_documents = None
_bm25_raw_documents = None
_vector_store = None

def initialize_rag_system():
    global _embedding_model, _chroma_client, _chroma_collection, _bm25_index, _corpus_documents, _bm25_raw_documents, _vector_store
    try:
        logger.debug("Loading lightweight ONNX embedding model...")
        _embedding_model = LightweightONNXEmbeddings()
        
        logger.debug("Loading Chroma database...")
        chroma_path = os.path.join(os.path.dirname(__file__), '..', 'vector database', 'chroma_tourism_db')
        _chroma_client = chromadb.PersistentClient(path=chroma_path)
        _chroma_collection = _chroma_client.get_collection("langchain")
        
        class CompatibleChromaStore:
            def __init__(self, collection, embedding_function):
                self._collection = collection
                self._embedding_function = embedding_function
            
            def similarity_search_with_score(self, query, k=10):
                query_embedding = self._embedding_function.embed_query(query)
                results = self._collection.query(
                    query_embeddings=[query_embedding],
                    n_results=k,
                    include=["documents", "distances", "metadatas"]
                )
                documents = []
                if results["documents"] and results["documents"][0]:
                    for i in range(len(results["documents"][0])):
                        doc_content = results["documents"][0][i]
                        distance = results["distances"][0][i]
                        metadata = results["metadatas"][0][i]
                        class CompatibleDocument:
                            def __init__(self, page_content, metadata):
                                self.page_content = page_content
                                self.metadata = metadata
                        documents.append((CompatibleDocument(doc_content, metadata), distance))
                return documents
        
        _vector_store = CompatibleChromaStore(_chroma_collection, _embedding_model)
        
        try:
            bm25_path = os.path.join(os.path.dirname(__file__), '..', 'vector database', 'bm25_index.pkl')
            with open(bm25_path, 'rb') as f:
                bm25_data = pickle.load(f)
                _bm25_index = bm25_data[0]
                _bm25_raw_documents = bm25_data[1]
                if hasattr(_bm25_raw_documents[0], 'page_content'):
                    _corpus_documents = [doc.page_content for doc in _bm25_raw_documents]
                else:
                    _corpus_documents = _bm25_raw_documents
        except Exception as e:
            logger.warning(f"Failed to load BM25 index: {e}")
            _bm25_index = None
            _corpus_documents = []
            _bm25_raw_documents = []
            
        logger.info("RAG system initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        return False

def rewrite_query_with_history(current_query: str, chat_history: list = None) -> str:
    # NEVER rewrite the first message. Trust the user's exact keywords.
    if not chat_history or len(chat_history) == 0:
        return current_query
        
    import google.generativeai as genai
    model = genai.GenerativeModel("gemini-2.5-flash") 
    
    history_text = "\n".join([f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in chat_history[-4:]])
    
    prompt = f"""Given the conversation history and the latest follow-up, rewrite the follow-up into a highly specific standalone search query for a Tourism Statistical Database.
    
    ⚙️ TRANSLATION RULES:
    - "months" or "time of year" -> "seasonality" or "monthly arrivals"
    - "money", "income" -> "revenue", "foreign exchange earnings"
    - "countries", "where from" -> "source markets"
    - "hotels" -> "accommodation establishments", "occupancy"
    - ALWAYS include the specific year if one is implied by the history.
    
    🛑 STRICT DOMAIN GUARDRAIL:
    If the question is completely unrelated to Sri Lanka, tourism, travel, hospitality, economics, or statistics, reply EXACTLY with the word: OUT_OF_DOMAIN
    
    Chat History:
    {history_text}
    
    Follow Up Input: {current_query}
    
    Standalone Query:"""
    
    try:
        response = model.generate_content(prompt)
        standalone_query = response.text.strip()
        return standalone_query if standalone_query else current_query
    except Exception as e:
        logger.error(f"Query rewrite failed: {e}")
        return current_query

def hybrid_retrieval(query: str, top_k: int = 15) -> List[Dict[str, Any]]:
    if not all([_embedding_model, _chroma_collection]):
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    bm25_available = _bm25_index is not None and _corpus_documents is not None
    
    try:
        # --- CONCEPT GROUPS FOR SYNONYM DRAGNET ---
        concept_groups = [
            {'revenue', 'earnings', 'exchange', 'receipts', 'usd', 'income', 'money', 'profit', 'financial', 'value', 'receipt', 'expenditure', 'spend', 'spending'},
            {'countries', 'country', 'market', 'markets', 'region', 'regions', 'source', 'nationality', 'nationalities'},
            {'hotel', 'hotels', 'accommodation', 'room', 'rooms', 'occupancy', 'establishments', 'resort', 'resorts', 'guest'},
            {'job', 'jobs', 'employment', 'direct', 'indirect', 'work', 'workforce'},
            {'month', 'months', 'seasonality', 'monthly', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'},
            {'purpose', 'reason', 'why', 'visit', 'leisure', 'business', 'holiday'},
            {'tourist', 'tourists', 'visitor', 'visitors', 'arrival', 'arrivals'},
            {'duration', 'stay', 'nights', 'days', 'long'},
            {'flight', 'flights', 'airline', 'airlines', 'airport', 'air', 'connectivity', 'transport'}
        ]
        
        raw_query_terms = [t for t in re.sub(r'[^\w\s]', ' ', query.lower()).split() if len(t) > 2]
        
        # Build the Synonym Dragnet
        expanded_query_terms = set(raw_query_terms)
        for term in raw_query_terms:
            for group in concept_groups:
                if term in group:
                    expanded_query_terms.update(group)
                    
        table_trigger_terms = {
            'revenue', 'arrivals', 'visitors', 'data', 'statistics', 'number', 
            'seasonality', 'month', 'markets', 'occupancy', 'earnings', 'employment', 
            'duration', 'airlines', 'expenditure'
        }
        requires_table = any(t in expanded_query_terms for t in table_trigger_terms)

        # 1. Fetch Semantic Net (Anchored for context)
        semantic_query = query
        if "tourism" not in query.lower() and "tourist" not in query.lower():
            semantic_query += " tourism data"

        semantic_docs = _vector_store.similarity_search_with_score(semantic_query, k=150)
        combined_dict = {}
        for doc, distance in semantic_docs:
            doc_str = doc.page_content
            metadata = doc.metadata
            semantic_score = 1.0 / (1.0 + distance)
            combined_dict[doc_str] = {'content': doc_str, 'metadata': metadata, 'score': semantic_score}
        
        # 2. Fetch BM25 (Using the Synonym Dragnet!)
        if bm25_available:
            # We pass the ENTIRE expanded synonym list to BM25. 
            # If the user asks for "revenue", BM25 searches for "revenue" AND "usd" AND "earnings"!
            bm25_scores = _bm25_index.get_scores(list(expanded_query_terms))
            top_bm25_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:50]
            max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
            
            for idx in top_bm25_indices:
                if bm25_scores[idx] <= 0: continue
                doc_str = _corpus_documents[idx]
                normalized_bm25 = bm25_scores[idx] / max_bm25
                
                if doc_str in combined_dict:
                    combined_dict[doc_str]['score'] += (normalized_bm25 * 0.5) 
                else:
                    raw_doc = _bm25_raw_documents[idx]
                    metadata = raw_doc.metadata if hasattr(raw_doc, 'metadata') else {'source_file': 'Tourism Report'}
                    combined_dict[doc_str] = {'content': doc_str, 'metadata': metadata, 'score': normalized_bm25 * 0.8}
        
        # 3. Super-Charged Re-ranking & DYNAMIC RANGE EXPANSION
        query_years = set(re.findall(r'\b(20\d{2})\b', query))
        year_ranges = re.findall(r'\b(20\d{2})\s*(?:-|to)\s*(20\d{2})\b', query)
        for start_year, end_year in year_ranges:
            start, end = sorted([int(start_year), int(end_year)])
            if end - start <= 20: 
                query_years.update(str(y) for y in range(start, end + 1))
                
        query_years_list = list(query_years)
        effective_top_k = max(top_k, len(query_years_list) * 2) if query_years_list else top_k
        effective_top_k = min(effective_top_k, 45)
        
        for doc_str, data in combined_dict.items():
            raw_year = data['metadata'].get('year')
            metadata_year = str(raw_year) if raw_year is not None else ""
            
            # A. Temporal Sorting
            if query_years_list:
                if metadata_year in query_years_list:
                    data['score'] *= 5.0  # Massive boost for matching years
                elif metadata_year:
                    data['score'] *= 0.05 # Stricter penalty to nuke the wrong years
            
            # B. HTML-Proof "Concept Hit" Matching
            clean_doc = re.sub(r'<[^>]+>', ' ', doc_str.lower())
            clean_doc = re.sub(r'[^\w\s]', ' ', clean_doc)
            doc_terms = set(clean_doc.split())
            
            match_count = 0
            for term in raw_query_terms:
                allowed_words = {term}
                for group in concept_groups:
                    if term in group:
                        allowed_words.update(group)
                        break
                
                # If the chunk contains ANY word from the concept group, it gets a point
                if any(w in doc_terms for w in allowed_words):
                    match_count += 1
            
            if match_count > 0:
                multiplier = min(1.0 + (0.5 * match_count), 5.0)
                data['score'] *= multiplier
            
            # C. Table Prioritization
            if requires_table:
                content_type = str(data['metadata'].get('content_type', '')).lower()
                if '<td>' in doc_str or '|' in doc_str or 'table' in content_type:
                    data['score'] *= 2.5 # Massive table boost
        
        results = list(combined_dict.values())
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:effective_top_k]
        
    except Exception as e:
        logger.error(f"Enhanced hybrid retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")

def build_context(retrieved_chunks: List[Dict[str, Any]]) -> str:
    if not retrieved_chunks:
        return "No relevant information found in tourism statistical reports."
    
    context_parts = []
    seen_texts = set()
    
    for i, chunk in enumerate(retrieved_chunks, 1):
        content = chunk['content'].strip()
        if content in seen_texts: continue
        seen_texts.add(content)
        
        metadata = chunk.get('metadata', {})
        year = metadata.get('year', 'Unknown')
        source = metadata.get('source_file', metadata.get('source', 'Tourism Report'))
        context_parts.append(f"Source {i} ({source}, Year: {year}):\n{content}")
    
    return "\n\n".join(context_parts)

def generate_rag_response(question: str, context: str) -> str:
    import google.generativeai as genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        system_prompt = """# Role: Expert Tourism Data Analyst & Master RAG Context Engineer

## 🎯 Primary Objective
You are an advanced analytical engine powering a Retrieval-Augmented Generation (RAG) system. Your dataset consists of Annual Statistical Reports for Tourism (2010 to 2025). Your goal is to accurately extract, calculate, and present tourism statistics based EXCLUSIVELY on the retrieved markdown chunks provided in the context.

## 🗂️ 1. HOW TO READ THE CONTEXT (CRITICAL)
- The context contains raw text and Markdown/HTML tables (`<table>`, `<tr>`, `<td>`). You are fully capable of extracting data out of HTML tables.
- **Currency/Units:** Pay extremely close attention to the units in tables (e.g., USD Mn vs RS Mn). Always default to USD if available, and clearly state the unit.
- **Table Reconstruction:** If a table appears split or lacks headers, use the chunk's metadata summary to align the data before answering.

## 📊 2. OUTPUT & FORMATTING STANDARDS
Always structure your answers beautifully so they are easy to read:
- **Single-Year Queries:** Output a clean, formatted "Year-in-Review" dashboard using markdown bullet points and bold headers.
- **Multi-Year/Trend Queries:** ALWAYS output a chronological Markdown Table comparing the requested metrics.
- **Calculations:** If you have the data, automatically calculate and provide Year-over-Year (YoY) growth percentages to add analytical value.

## 🚫 3. ZERO HALLUCINATION PROTOCOL
- NEVER invent, estimate, or pull in outside numbers not present in the provided context.
- If data for a specific metric or year is missing from the context, explicitly state: "The specific data for [Metric] in [Year] is not available in the current retrieved documents."
- Every numerical claim or table you provide MUST end with an inline citation referencing the source file (e.g., `(Source: 2022.md)`).
"""
        full_prompt = f"{system_prompt}\n\nContext from tourism reports:\n{context}\n\nUser Question: {question}\n\nPlease provide a comprehensive analysis using ONLY the available data above."
        
        response = model.generate_content(full_prompt)
        if response and response.text:
            return response.text.strip()
        else:
            raise HTTPException(status_code=500, detail="No response generated from LLM")
            
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        if "quota" in str(e).lower() or "429" in str(e) or "rate limit" in str(e).lower():
            return "I am currently experiencing an API limit. Please try again shortly."
        raise HTTPException(status_code=500, detail=f"Response generation failed: {str(e)}")

async def handle_tourism_rag_query(question: str, chat_history: list = None) -> Dict[str, Any]:
    try:
        if _embedding_model is None:
            if not initialize_rag_system():
                raise HTTPException(status_code=500, detail="Failed to initialize RAG system")
        
        # 1. REWRITE QUERY FOR MEMORY & CHECK DOMAIN
        search_query = rewrite_query_with_history(question, chat_history)
        
        if search_query == "OUT_OF_DOMAIN":
            return {
                "response": "I am a specialized Sri Lanka Tourism Data Assistant. I can only answer questions related to tourism statistics, economic impacts, arrivals, and hospitality trends.",
                "sources": [],
                "chunks_used": 0,
                "context_available": False
            }
            
        logger.info(f"Original: '{question}' -> Rewritten for DB: '{search_query}'")
        
        # 2. FETCH CHUNKS
        retrieved_chunks = hybrid_retrieval(search_query, top_k=15)
        context = build_context(retrieved_chunks)
        
        # 3. EXTRACT SOURCES
        sources = []
        for chunk in retrieved_chunks:
            metadata = chunk.get('metadata', {})
            source_file = metadata.get('source_file', metadata.get('source', 'Unknown'))
            if source_file != 'Unknown':
                source_info = f"{source_file}"
                if 'year' in metadata:
                    source_info += f" ({metadata['year']})"
                sources.append(source_info)
        
        # 4. GENERATE RESPONSE
        response = generate_rag_response(question, context)
        
        return {
            "response": response,
            "sources": list(set(sources)),
            "chunks_used": len(retrieved_chunks),
            "context_available": len(retrieved_chunks) > 0,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced tourism RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")

# Initialize the RAG system
initialize_rag_system()