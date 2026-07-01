import re
import nltk
from typing import List

# Download NLTK data required for tokenization, stopword removal, and lemmatization
def download_nltk_resources():
    resources = {
        "punkt": "tokenizers/punkt",
        "stopwords": "corpora/stopwords",
        "wordnet": "corpora/wordnet"
    }
    for resource_name, path in resources.items():
        try:
            nltk.data.find(path)
        except (LookupError, Exception):
            try:
                nltk.download(resource_name, quiet=True)
            except Exception as e:
                print(f"Warning: Failed to download NLTK resource {resource_name}: {e}")

try:
    download_nltk_resources()
except Exception as e:
    print(f"Warning: NLTK initialization failed: {e}")

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer

# Initialize lemmatizer and load stopwords
try:
    STOP_WORDS = set(stopwords.words("english"))
except Exception:
    # Fallback to standard English stopwords if NLTK download fails
    STOP_WORDS = {
        "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
        "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", 
        "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", 
        "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", 
        "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", 
        "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", 
        "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", 
        "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", 
        "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", 
        "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", 
        "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", 
        "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"
    }

try:
    lemmatizer = WordNetLemmatizer()
except Exception:
    lemmatizer = None

def tokenize_text(text: str) -> List[str]:
    """
    Converts text to lowercase, removes punctuation, and tokenizes it.
    """
    if not text:
        return []
    # Lowercase the text
    text_lower = text.lower()
    # Fallback tokenization if NLTK tokenize fails
    try:
        tokens = word_tokenize(text_lower)
    except Exception:
        tokens = re.findall(r"\b[a-z0-9]+\b", text_lower)
        
    # Clean tokens to keep only alphanumeric characters
    cleaned_tokens = []
    for token in tokens:
        cleaned = re.sub(r"[^a-z0-9]", "", token)
        if cleaned:
            cleaned_tokens.append(cleaned)
    return cleaned_tokens

def remove_stopwords(tokens: List[str]) -> List[str]:
    """
    Filters out English stopwords from the token list.
    """
    return [token for token in tokens if token not in STOP_WORDS]

def lemmatize_tokens(tokens: List[str]) -> List[str]:
    """
    Lemmatizes each token using WordNetLemmatizer.
    """
    if not lemmatizer:
        return tokens
    
    lemmatized = []
    for token in tokens:
        try:
            # We assume word is noun by default (standard CSE level simplicity)
            lemma = lemmatizer.lemmatize(token)
        except Exception:
            lemma = token
        lemmatized.append(lemma)
    return lemmatized

def preprocess_text(text: str) -> str:
    """
    Applies the full preprocessing pipeline:
    1. Tokenization
    2. Stopword Removal
    3. Lemmatization
    Returns a space-separated string of processed tokens.
    """
    tokens = tokenize_text(text)
    tokens_no_stop = remove_stopwords(tokens)
    lemmatized_tokens = lemmatize_tokens(tokens_no_stop)
    return " ".join(lemmatized_tokens)
