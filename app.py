from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import requests
from collections import defaultdict
import time

app = FastAPI()

# Simple in-memory cache for suggestions
suggestions_cache = defaultdict(dict)
CACHE_EXPIRY_TIME = 600  # Cache expiry time in seconds

def make_request_with_retry(url, max_retries=3, delay=5):
    for i in range(max_retries):
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return response
            elif response.status_code == 429:
                print(f"Rate limit exceeded. Attempt {i+1}: Retrying after delay.")
                time.sleep(delay)
                delay *= 2  # Exponential backoff
            else:
                print(f"Attempt {i+1}: Failed request - Status Code: {response.status_code}, Raw Response: {response.text}")
        except requests.RequestException as e:
            print(f"Attempt {i+1}: Request exception - {e}")
    return None

def get_semantic_scholar_suggestions(query):
    url = f'https://api.semanticscholar.org/graph/v1/paper/search?query={query}&fields=title,url,abstract'
    response = make_request_with_retry(url)
    if not response:
        return []
    results = response.json()['data']
    suggestions = [result['title'] for result in results]
    return suggestions

class SearchQuery(BaseModel):
    query: str

@app.post("/search_papers")
async def search_papers(search_query: SearchQuery):
    query = search_query.query
    if not query:
        raise HTTPException(status_code=400, detail="No query provided")

    url = f'https://api.semanticscholar.org/graph/v1/paper/search?query={query}&fields=title,url,abstract'
    response = make_request_with_retry(url)

    if not response:
        raise HTTPException(status_code=500, detail="Failed to get search results")

    search_results = response.json()['data']
    papers = [{"title": result['title'], "url": result['url'], "snippet": result.get('abstract', '')} for result in search_results]
    return {"papers": papers}

@app.get("/suggest")
async def suggest(q: str = Query(..., min_length=3, description="The user's input query to get suggestions for")):
    current_time = time.time()
    # Check cache
    if q in suggestions_cache and (current_time - suggestions_cache[q]['time']) < CACHE_EXPIRY_TIME:
        return {"suggestions": suggestions_cache[q]['data']}

    try:
        suggestions = get_semantic_scholar_suggestions(q)
    except Exception as e:
        print("Error getting suggestions:", e)
        raise HTTPException(status_code=500, detail="Failed to get suggestions")

    # Store in cache
    suggestions_cache[q] = {'data': suggestions, 'time': time.time()}
    return {"suggestions": suggestions}

# Add root URL route
@app.get("/")
async def read_root():
    return {"message": "Welcome to the Research Paper Assistant API. Use /docs for interactive API documentation."}
