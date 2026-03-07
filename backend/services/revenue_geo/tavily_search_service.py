"""
tavily_search_service.py
~~~~~~~~~~~~~~~~~~~~~~~~
Tavily API integration for Geopolitical Revenue Intelligence.

Executes 7 revenue-specific search queries:
1. Conflict impact
2. Travel advisory updates
3. Airline disruptions  
4. Oil price & energy
5. Global tourism risk
6. High-value markets sentiment
7. FX and macro factors

Results are aggregated, deduplicated by domain, and formatted for Groq analysis.
"""

import aiohttp
import json
import logging
from typing import Dict, List, Any
from datetime import datetime
import os

logger = logging.getLogger(__name__)


class TavilySearchService:
    """
    Manages Tavily API searches for revenue geopolitical intelligence.
    """

    def __init__(self, api_key: str = None):
        """
        Initialize with Tavily API key.
        
        Args:
            api_key: Tavily API key. If None, read from TAVILY_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        if not self.api_key:
            raise ValueError("TAVILY_API_KEY not provided and not found in environment")
        
        self.base_url = "https://api.tavily.com/search"

    async def execute_search(
        self,
        query: str,
        max_results: int = 10,
        include_answer: bool = True
    ) -> Dict[str, Any]:
        """
        Execute a single Tavily search query.
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            include_answer: Whether to include AI-generated answer
            
        Returns:
            Dict with 'results' list and 'answer' if requested
        """
        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "include_answer": include_answer,
            "search_depth": "basic",
            "topic": "news"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data
                    else:
                        logger.error(f"Tavily search failed with status {response.status}: {await response.text()}")
                        return {"results": [], "answer": ""}
        except Exception as e:
            logger.error(f"Tavily search error: {e}")
            return {"results": [], "answer": ""}

    async def execute_revenue_impact_searches(self) -> Dict[str, Any]:
        """
        Execute all 7 revenue-specific search queries in parallel.
        
        Returns:
            Aggregated results with category labels and metadata
        """
        queries = {
            "CONFLICT": "Middle East conflict tourism impact South Asia current month",
            "TRAVEL_ADVISORY": "Sri Lanka travel advisory update current month",
            "AIRLINE_DISRUPTION": "Dubai Doha Abu Dhabi airline disruption South Asia current month",
            "OIL_PRICE": "oil price airline fares travel demand impact current month",
            "GLOBAL_TOURISM_RISK": "global conflict crisis tourism demand impact Asia current month",
            "HIGH_VALUE_MARKETS": "UK Europe long haul travel sentiment conflict inflation travel current month",
            "FX_AND_MACRO": "currency volatility tourism receipts travel demand Asia current month",
        }

        results = {}
        
        # Execute searches in parallel
        import asyncio
        tasks = [
            self.execute_search(query, max_results=10)
            for query in queries.values()
        ]
        
        search_results = await asyncio.gather(*tasks)

        # Map results back to categories
        for (category, query), result in zip(queries.items(), search_results):
            if result.get("results"):
                results[category] = {
                    "query": query,
                    "results": result.get("results", []),
                    "answer": result.get("answer", ""),
                    "result_count": len(result.get("results", [])),
                    "search_timestamp": datetime.utcnow().isoformat() + "Z"
                }
            else:
                results[category] = {
                    "query": query,
                    "results": [],
                    "answer": "",
                    "result_count": 0,
                    "search_timestamp": datetime.utcnow().isoformat() + "Z"
                }

        return {
            "searches_executed": len(queries),
            "categories": results,
            "aggregated_at": datetime.utcnow().isoformat() + "Z"
        }

    def format_for_groq(self, tavily_results: Dict[str, Any]) -> str:
        """
        Format aggregated Tavily results into a readable context for Groq analysis.
        
        Args:
            tavily_results: Output from execute_revenue_impact_searches()
            
        Returns:
            Formatted string suitable for prompt injection
        """
        formatted = []
        formatted.append("=" * 90)
        formatted.append("SEARCH RESULTS CONTEXT (Tavily)")
        formatted.append("=" * 90)
        formatted.append("")

        categories = tavily_results.get("categories", {})

        for category, data in categories.items():
            formatted.append(f"--- {category} ---")
            formatted.append(f"Query: {data.get('query', 'N/A')}")
            formatted.append(f"Results Found: {data.get('result_count', 0)}")
            formatted.append("")

            if data.get("results"):
                for idx, result in enumerate(data["results"], 1):
                    formatted.append(f"  [{idx}] {result.get('title', 'No title')}")
                    formatted.append(f"      Source: {result.get('source', 'Unknown')}")
                    formatted.append(f"      {result.get('description', 'No description')[:200]}")
                    formatted.append("")

            if data.get("answer"):
                formatted.append(f"  AI Summary: {data['answer']}")
                formatted.append("")

        formatted.append("=" * 90)
        formatted.append(f"Search Aggregated At: {tavily_results.get('aggregated_at', 'N/A')}")
        formatted.append("=" * 90)

        return "\n".join(formatted)

    def extract_domains(self, tavily_results: Dict[str, Any]) -> tuple[List[str], List[str]]:
        """
        Extract unique domains from search results and identify categories with no results.
        
        Args:
            tavily_results: Output from execute_revenue_impact_searches()
            
        Returns:
            Tuple of (domains_with_results, categories_with_no_results)
        """
        domains = set()
        categories_with_no_results = []

        categories = tavily_results.get("categories", {})

        for category, data in categories.items():
            if data.get("results"):
                for result in data["results"]:
                    source = result.get("source", "")
                    if source:
                        # Extract domain from source URL
                        try:
                            from urllib.parse import urlparse
                            domain = urlparse(source).netloc or source
                            domains.add(domain)
                        except:
                            domains.add(source)
            else:
                categories_with_no_results.append(category)

        return sorted(list(domains)), categories_with_no_results
