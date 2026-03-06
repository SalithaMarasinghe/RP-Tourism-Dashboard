"""
tourism_rag.py
~~~~~~~~~~~~~
RAG-based Tourism Data Assistant service.
Implements hybrid retrieval combining semantic search and BM25 keyword search.
Delegates analytical generation entirely to the LLM to prevent extraction errors.
"""
import logging
import os
import pickle
import re
from typing import Any, Dict, List

import chromadb
import numpy as np
from rank_bm25 import BM25Okapi
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

# Global variables for loaded models and databases
_embedding_model = None
_chroma_client = None
_chroma_collection = None
_bm25_index = None
_corpus_documents = None
_bm25_raw_documents = None
_vector_store = None


def initialize_rag_system():
    """Initialize RAG system by loading models and databases."""
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
                        
                        doc = CompatibleDocument(doc_content, metadata)
                        documents.append((doc, distance))
                return documents
        
        _vector_store = CompatibleChromaStore(_chroma_collection, _embedding_model)
        
        logger.debug("Loading BM25 index...")
        try:
            bm25_path = os.path.join(os.path.dirname(__file__), '..', 'vector database', 'bm25_index.pkl')
            with open(bm25_path, 'rb') as f:
                bm25_data = pickle.load(f)
                _bm25_index = bm25_data[0]
                _bm25_raw_documents = bm25_data[1]
                
                # Recover raw documents so BM25-only hits still get their metadata
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


def hybrid_retrieval(query: str, top_k: int = 15) -> List[Dict[str, Any]]:
    """Retrieves chunks using hybrid semantic and keyword search with true Union logic."""
    if not all([_embedding_model, _chroma_collection]):
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    bm25_available = _bm25_index is not None and _corpus_documents is not None
    
    try:
        # Extract all years mentioned in the query for targeted boosting
        query_years = re.findall(r'\b(20\d{2})\b', query)
        
        # 1. Semantic Search
        semantic_docs = _vector_store.similarity_search_with_score(query, k=top_k * 2)
        combined_dict = {}
        
        for doc, distance in semantic_docs:
            doc_str = doc.page_content
            metadata = doc.metadata
            # Safe distance inversion (smaller distance = higher score)
            semantic_score = 1.0 / (1.0 + distance)
            
            combined_dict[doc_str] = {
                'content': doc_str,
                'metadata': metadata,
                'score': semantic_score
            }
        
        # 2. BM25 Search (True Union)
        if bm25_available:
            # Strip punctuation from query so HTML tags don't block BM25 tokenization
            clean_query = re.sub(r'[^\w\s]', ' ', query.lower())
            tokenized_query = clean_query.split()
            
            bm25_scores = _bm25_index.get_scores(tokenized_query)
            top_bm25_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:top_k]
            
            max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
            
            for idx in top_bm25_indices:
                if bm25_scores[idx] <= 0:
                    continue
                    
                doc_str = _corpus_documents[idx]
                normalized_bm25 = bm25_scores[idx] / max_bm25
                
                if doc_str in combined_dict:
                    # Give it a hybrid boost if both engines found it
                    combined_dict[doc_str]['score'] += (normalized_bm25 * 0.3)
                else:
                    # Append it if only BM25 found it (Union)
                    raw_doc = _bm25_raw_documents[idx]
                    metadata = raw_doc.metadata if hasattr(raw_doc, 'metadata') else {'source_file': 'Tourism Report'}
                    
                    combined_dict[doc_str] = {
                        'content': doc_str,
                        'metadata': metadata,
                        'score': normalized_bm25 * 0.8
                    }
        
        # 3. Apply Metadata Year Boosting
        for doc_str, data in combined_dict.items():
            metadata_year = str(data['metadata'].get('year', ''))
            if query_years and metadata_year in query_years:
                data['score'] *= 1.5  # Strong boost for explicit year match
        
        # 4. Sort and Return Top K
        results = list(combined_dict.values())
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]
        
    except Exception as e:
        logger.error(f"Enhanced hybrid retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")


def build_context(retrieved_chunks: List[Dict[str, Any]]) -> str:
    if not retrieved_chunks:
        return "No relevant information found in tourism statistical reports."
    
    context_parts = []
    for i, chunk in enumerate(retrieved_chunks, 1):
        content = chunk['content']
        metadata = chunk.get('metadata', {})
        year = metadata.get('year', 'Unknown')
        source = metadata.get('source_file', metadata.get('source', 'Tourism Report'))
        
        context_parts.append(f"Source {i} ({source}, Year: {year}):\n{content}")
    
    return "\n\n".join(context_parts)


def generate_rag_response(question: str, context: str) -> str:
    import google.generativeai as genai
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        system_prompt = """# Role: Expert Tourism Data Analyst & Master RAG Context Engineer

## 🎯 Primary Objective
You are an advanced analytical engine powering a Retrieval-Augmented Generation (RAG) system. Your dataset consists of Annual Statistical Reports for Tourism (2010 to 2025). Your goal is to accurately extract, calculate, and present tourism statistics based EXCLUSIVELY on the retrieved markdown chunks provided in the context.

## 🗂️ 1. HOW TO READ THE CONTEXT (CRITICAL)
- The context contains raw text and Markdown tables extracted from reports.
- **Currency/Units:** Pay extremely close attention to the units in tables (e.g., USD Mn vs RS Mn). Always default to USD if available, and clearly state the unit.
- **Table Reconstruction:** If a table appears split or lacks headers, use the chunk's metadata summary (e.g., "Table with columns: ...") to align the data before answering.

## 📊 2. OUTPUT & FORMATTING STANDARDS
Always structure your answers beautifully so they are easy to read:
- **Single-Year Queries:** If the user asks about a specific year, output a clean, formatted "Year-in-Review" dashboard using markdown bullet points and bold headers (e.g., 🌍 Top Markets, 💰 Economic Impact, 🏨 Accommodation).
- **Multi-Year/Trend Queries:** If the user asks for a comparison or trend across multiple years, ALWAYS output a chronological Markdown Table comparing the requested metrics.
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
            return generate_fallback_response(question, context)
        raise HTTPException(status_code=500, detail=f"Response generation failed: {str(e)}")


def generate_fallback_response(question: str, context: str) -> str:
    if not context.strip():
        return "I apologize, but I couldn't find relevant information in the tourism reports to answer your question."
    
    import re
    years_in_context = re.findall(r'\b(20\d{2})\b', context)
    years_mentioned = list(set(years_in_context)) if years_in_context else ["2010-2025"]
    
    return f"I found relevant tourism data in the reports covering {', '.join(years_mentioned[:3])}, but I am currently experiencing an API limit. Please try again shortly."


async def handle_tourism_rag_query(question: str) -> Dict[str, Any]:
    try:
        if _embedding_model is None:
            if not initialize_rag_system():
                raise HTTPException(status_code=500, detail="Failed to initialize RAG system")
        
        retrieved_chunks = hybrid_retrieval(question, top_k=15)
        
        # Expand search if results are weak
        if len(retrieved_chunks) < 8 or all(chunk.get('score', 0) < 0.3 for chunk in retrieved_chunks):
            broader_query = question + " tourism statistics data"
            additional_chunks = hybrid_retrieval(broader_query, top_k=10)
            
            seen_contents = set(chunk.get('content', '') for chunk in retrieved_chunks)
            for chunk in additional_chunks:
                if chunk.get('content', '') not in seen_contents:
                    retrieved_chunks.append(chunk)
            
            retrieved_chunks.sort(key=lambda x: x.get('score', 0), reverse=True)
            retrieved_chunks = retrieved_chunks[:15]
        
        # Build context directly from documents
        context = build_context(retrieved_chunks)
        
        # Extract distinct sources for the frontend array
        sources = []
        for chunk in retrieved_chunks:
            metadata = chunk.get('metadata', {})
            source_file = metadata.get('source_file', metadata.get('source', 'Unknown'))
            if source_file != 'Unknown':
                source_info = f"{source_file}"
                if 'year' in metadata:
                    source_info += f" ({metadata['year']})"
                sources.append(source_info)
        
        # Rely on the LLM to generate the structured response based on the robust prompt
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