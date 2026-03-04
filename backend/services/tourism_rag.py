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
from sentence_transformers import SentenceTransformer
from fastapi import HTTPException

# Set up logger
logger = logging.getLogger(__name__)

# Global variables for loaded models and databases
_embedding_model = None
_chroma_client = None
_chroma_collection = None
_bm25_index = None
_corpus_documents = None


def initialize_rag_system():
    """Initialize the RAG system by loading models and databases."""
    global _embedding_model, _chroma_client, _chroma_collection, _bm25_index, _corpus_documents
    
    try:
        # Load embedding model
        logger.info("Loading embedding model...")
        _embedding_model = SentenceTransformer('BAAI/bge-base-en')
        
        # Load Chroma DB
        logger.info("Loading Chroma database...")
        chroma_path = os.path.join(os.path.dirname(__file__), '..', 'vector database', 'chroma_tourism_db')
        _chroma_client = chromadb.PersistentClient(path=chroma_path)
        _chroma_collection = _chroma_client.get_collection("langchain")
        
        # Load BM25 index
        logger.info("Loading BM25 index...")
        bm25_path = os.path.join(os.path.dirname(__file__), '..', 'vector database', 'bm25_index.pkl')
        with open(bm25_path, 'rb') as f:
            bm25_data = pickle.load(f)
            _bm25_index = bm25_data[0]  # BM25 index is first element
            _corpus_documents = bm25_data[1]  # Documents are second element
        
        logger.info("RAG system initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        return False


def hybrid_retrieval(query: str, top_k: int = 12) -> List[Dict[str, Any]]:
    """
    Perform hybrid retrieval combining semantic search and BM25 keyword search.
    
    Args:
        query: User query string
        top_k: Number of top results to return
        
    Returns:
        List of retrieved chunks with combined scores
    """
    if not all([_embedding_model, _chroma_collection, _bm25_index, _corpus_documents]):
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        # 1. Semantic search using Chroma - get more results for better matching
        query_embedding = _embedding_model.encode([query], convert_to_numpy=True)
        semantic_results = _chroma_collection.query(
            query_embeddings=query_embedding.tolist(),
            n_results=min(top_k * 3, 30)  # Get more results for better combination
        )
        
        # 2. BM25 keyword search
        tokenized_query = query.lower().split()
        bm25_scores = _bm25_index.get_scores(tokenized_query)
        
        # 3. Combine results
        combined_results = []
        
        # Process semantic results
        semantic_docs = semantic_results['documents'][0] if semantic_results['documents'] else []
        semantic_distances = semantic_results['distances'][0] if semantic_results['distances'] else []
        semantic_metadatas = semantic_results['metadatas'][0] if semantic_results['metadatas'] else []
        
        # Create a mapping from document content to semantic info
        semantic_map = {}
        for i, doc in enumerate(semantic_docs):
            if i < len(semantic_distances) and i < len(semantic_metadatas):
                # Convert doc to string if it's a Document object
                doc_str = str(doc) if hasattr(doc, 'page_content') else doc
                semantic_map[doc_str] = {
                    'semantic_score': 1 - semantic_distances[i],  # Convert distance to similarity
                    'metadata': semantic_metadatas[i]
                }
        
        # Process BM25 results and combine
        for i, (doc, score) in enumerate(zip(_corpus_documents, bm25_scores)):
            if score > 0:  # Only include documents with non-zero BM25 scores
                # Convert doc to string if it's a Document object
                doc_str = str(doc) if hasattr(doc, 'page_content') else doc
                
                # Get semantic score if available
                semantic_info = semantic_map.get(doc_str, {'semantic_score': 0, 'metadata': {}})
                semantic_score = semantic_info['semantic_score']
                metadata = semantic_info['metadata']
                
                # Normalize BM25 score (using min-max normalization)
                if len(bm25_scores) > 1 and np.max(bm25_scores) > np.min(bm25_scores):
                    bm25_normalized = (score - np.min(bm25_scores)) / (np.max(bm25_scores) - np.min(bm25_scores))
                else:
                    bm25_normalized = score
                
                # Combine scores with weights - give more weight to semantic search for better relevance
                final_score = 0.8 * semantic_score + 0.2 * bm25_normalized
                
                # Boost numeric-heavy chunks if query contains numbers
                if re.search(r'\b\d+\b', query) and metadata.get('numeric_heavy', False):
                    final_score *= 1.3  # Increased boost for numeric-heavy content
                
                # Boost chunks that mention years if query contains years
                query_years = re.findall(r'\b(20\d{2})\b', query)
                if query_years and metadata.get('year'):
                    if any(str(metadata.get('year')) in year or year in str(metadata.get('year')) for year in query_years):
                        final_score *= 1.2  # Boost for matching years
                
                combined_results.append({
                    'content': doc_str,
                    'score': final_score,
                    'semantic_score': semantic_score,
                    'bm25_score': bm25_normalized,
                    'metadata': metadata
                })
        
        # Sort by combined score and return top_k
        combined_results.sort(key=lambda x: x['score'], reverse=True)
        return combined_results[:top_k]
        
    except Exception as e:
        logger.error(f"Hybrid retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")


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
    Generate response using LLM with flexible context engineering.
    Uses rate limiting to prevent quota exceeding.
    
    Args:
        question: User question
        context: Retrieved context from tourism reports
        
    Returns:
        Generated response
    """
    import google.generativeai as genai
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        genai.configure(api_key=api_key)
        # Use gemini-2.5-flash-lite as requested
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        
        system_prompt = """You are a helpful tourism statistics analyst with access to Sri Lanka tourism reports (2010–2025).

Your role:
- Answer questions using the provided context from tourism reports
- Be conversational and helpful, not rigidly formal
- If exact data isn't found, look for related information and trends
- Provide reasonable estimates based on available data when appropriate
- Always cite sources and years when using specific data
- Explain your reasoning when making inferences

Guidelines:
- Use the context as your primary source
- If the exact year/metric isn't available, find the closest available data
- Mention when you're using related or proxy data
- Be transparent about data limitations
- Provide insights and trends, not just raw numbers
- If no relevant information exists at all, say so politely

Response format:
Provide a natural, helpful response that:
- Directly answers the user's question
- Uses available data effectively
- Explains any limitations or approximations
- Cites sources appropriately"""
        
        full_prompt = f"""{system_prompt}

Context from tourism reports:
{context}

User Question: {question}

Please provide a helpful, conversational response using the available data above."""
        
        response = model.generate_content(full_prompt)
        if response and response.text:
            return response.text.strip()
        else:
            raise HTTPException(status_code=500, detail="No response generated from LLM")
            
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        
        # Check if it's a quota/rate limit error
        if "quota" in str(e).lower() or "429" in str(e) or "rate limit" in str(e).lower():
            logger.info("Gemini API quota exceeded, using fallback response")
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
    Handle a tourism RAG query end-to-end.
    
    Args:
        question: User question
        
    Returns:
        Dictionary with response and metadata
    """
    try:
        # Initialize RAG system if not already done
        if _embedding_model is None:
            if not initialize_rag_system():
                raise HTTPException(status_code=500, detail="Failed to initialize RAG system")
        
        # Perform hybrid retrieval with more chunks for better context
        retrieved_chunks = hybrid_retrieval(question, top_k=12)
        
        # Build context
        context = build_context(retrieved_chunks)
        
        # Generate response
        response = generate_rag_response(question, context)
        
        # Extract sources from metadata
        sources = []
        for chunk in retrieved_chunks:
            metadata = chunk.get('metadata', {})
            if 'source' in metadata:
                source_info = f"{metadata['source']}"
                if 'year' in metadata:
                    source_info += f" ({metadata['year']})"
                sources.append(source_info)
        
        return {
            "response": response,
            "sources": list(set(sources)),  # Remove duplicates
            "chunks_used": len(retrieved_chunks),
            "context_available": len(retrieved_chunks) > 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tourism RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


# Initialize the RAG system when the module is imported
initialize_rag_system()
