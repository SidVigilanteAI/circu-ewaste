import warnings
from typing import List, Dict, Any
from duckduckgo_search import DDGS

warnings.filterwarnings("ignore", category=RuntimeWarning, module="duckduckgo_search")

def search_web_snippets(query: str, max_results: int = 4) -> List[Dict[str, str]]:
    """Performs a web search via DuckDuckGo and returns structured snippets with titles, URLs, and bodies."""
    try:
        with DDGS() as ddgs:
            raw_results = list(ddgs.text(query, max_results=max_results))
            clean_results = []
            for item in raw_results:
                clean_results.append({
                    "title": item.get("title", ""),
                    "url": item.get("href", ""),
                    "snippet": item.get("body", "")
                })
            return clean_results
    except Exception as e:
        return [{"title": "Search Error", "url": "", "snippet": f"Could not perform web search: {str(e)}"}]

def gather_circular_market_intelligence(device_name: str) -> str:
    """
    Executes multiple targeted searches across secondary marketplaces, repair databases,
    and e-waste recycling hubs to feed comprehensive context into the LLM evaluation.
    """
    queries = [
        f"{device_name} used price refurbished Cashify CeX Flipkart India",
        f"{device_name} repair cost screen battery replacement iFixit India",
        f"{device_name} e-waste recycling trade-in scrap value Karo Sambhav India"
    ]
    
    aggregated_context = []
    
    for q in queries:
        snippets = search_web_snippets(q, max_results=3)
        section = [f"=== Search Query: {q} ==="]
        for s in snippets:
            if s["url"]:
                section.append(f"Title: {s['title']}\nURL: {s['url']}\nDetails: {s['snippet']}\n")
        aggregated_context.append("\n".join(section))
        
    return "\n\n--------------------------------\n\n".join(aggregated_context)
