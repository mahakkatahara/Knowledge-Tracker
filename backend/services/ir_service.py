import sqlite3
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.utils.text_processing import preprocess_text

class UserIRIndex:
    """
    Maintains the state of the Information Retrieval (IR) Index
    for a specific user in memory.
    """
    def __init__(self, user_id: int):
        self.user_id: int = user_id
        self.note_ids: List[int] = []
        self.note_titles: Dict[int, str] = {}
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix: Any = None
        self.inverted_index: Dict[str, List[int]] = {}  # term -> list of note_ids

# Global dict to store in-memory indices for all users, keyed by user_id
_user_indices: Dict[int, UserIRIndex] = {}

def get_user_index(user_id: int) -> UserIRIndex:
    """
    Retrieves or initializes the IR index for the given user.
    """
    if user_id not in _user_indices:
        _user_indices[user_id] = UserIRIndex(user_id)
    return _user_indices[user_id]

def rebuild_user_index(db: sqlite3.Connection, user_id: int) -> UserIRIndex:
    """
    Rebuilds the TF-IDF vectorizer, TF-IDF matrix, and Inverted Index
    for the specified user's notes.
    """
    index = get_user_index(user_id)
    
    # 1. Fetch notes for this user
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, title, content FROM notes WHERE user_id = ?",
        (user_id,)
    )
    rows = cursor.fetchall()
    
    # Reset current index fields
    index.note_ids = []
    index.note_titles = {}
    index.vectorizer = None
    index.tfidf_matrix = None
    index.inverted_index = {}
    
    if not rows:
        return index
        
    documents = []
    for row in rows:
        note_id = row["id"]
        title = row["title"]
        content = row["content"]
        
        index.note_ids.append(note_id)
        index.note_titles[note_id] = title
        
        # Combine title and content to build rich context
        combined_text = f"{title} {content}"
        preprocessed = preprocess_text(combined_text)
        documents.append(preprocessed)
        
        # Build inverted index
        tokens = set(preprocessed.split())
        for token in tokens:
            if token not in index.inverted_index:
                index.inverted_index[token] = []
            index.inverted_index[token].append(note_id)
            
    # 2. Fit TF-IDF Vectorizer & compute document representations
    # Ensure there is at least one non-empty document to avoid sklearn errors
    non_empty_docs = [doc for doc in documents if doc.strip()]
    if non_empty_docs:
        index.vectorizer = TfidfVectorizer(use_idf=True, norm="l2")
        index.tfidf_matrix = index.vectorizer.fit_transform(documents)
        
    return index

def search_user_notes(db: sqlite3.Connection, user_id: int, query: str) -> List[Dict[str, Any]]:
    """
    Searches the user's notes using the pre-computed TF-IDF index and Cosine Similarity.
    Ranks notes based on relevance score.
    """
    if not query.strip():
        return []
        
    index = get_user_index(user_id)
    
    # Lazy build: if the user's index is not initialized or has no vectorizer, build it
    if not index.note_ids or index.vectorizer is None:
        index = rebuild_user_index(db, user_id)
        
    # If the user still has no index or notes, return empty list
    if not index.note_ids or index.vectorizer is None:
        return []
        
    # 1. Preprocess the search query
    processed_query = preprocess_text(query)
    query_tokens = processed_query.split()
    
    if not query_tokens:
        return []
        
    # 2. Candidate Selection via Inverted Index
    # Filter notes that contain at least one of the query terms to focus similarity scoring
    candidate_note_ids = set()
    for token in query_tokens:
        if token in index.inverted_index:
            candidate_note_ids.update(index.inverted_index[token])
            
    if not candidate_note_ids:
        return []
        
    # 3. Calculate Cosine Similarity
    # Transform query to the same TF-IDF vector space
    query_vector = index.vectorizer.transform([processed_query])
    
    # Compute similarity against all document vectors
    similarities = cosine_similarity(query_vector, index.tfidf_matrix).flatten()
    
    # 4. Map similarity scores and rank
    results = []
    for note_id in candidate_note_ids:
        try:
            doc_idx = index.note_ids.index(note_id)
            score = float(similarities[doc_idx])
            # Only include results that have some level of match
            if score > 0.0:
                results.append({
                    "note_id": note_id,
                    "title": index.note_titles[note_id],
                    "score": round(score, 4)
                })
        except ValueError:
            continue
            
    # Sort by relevance score in descending order
    results.sort(key=lambda x: x["score"], reverse=True)
    return results

def clear_indices():
    """
    Clears all cached in-memory user indices. Useful for testing.
    """
    global _user_indices
    _user_indices.clear()
