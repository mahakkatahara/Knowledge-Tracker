import re
from typing import List, Dict, Any
from backend.config import CHUNK_SIZE, CHUNK_OVERLAP

def clean_text(text: str) -> str:
    """
    Cleans raw text by normalizing whitespaces and multiple linebreaks.
    """
    if not text:
        return ""
    # Normalize spaces and tabs
    text = re.sub(r"[ \t]+", " ", text)
    # Normalize multiple linebreaks
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def split_text_into_chunks(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP
) -> List[Dict[str, Any]]:
    """
    Splits text content into overlapping chunks using a recursive separator-based merger.
    Conforms to standard NLP token/character window limits by prioritizing structural
    delimiters (paragraphs, sentences, words), splitting down to character blocks only
    when a segment exceeds the target chunk size.
    """
    # Enforce safe constraints
    if chunk_size <= 0:
        chunk_size = 500
    if chunk_overlap >= chunk_size:
        chunk_overlap = chunk_size // 10

    # Ordered list of separators representing structural splits
    separators = ["\n\n", "\n", " ", ""]
    
    def _split_text(txt: str, seps: List[str]) -> List[str]:
        # If the text fragment fits inside chunk_size, do not split it further
        if len(txt) <= chunk_size:
            return [txt]
        if not seps:
            return [txt]
            
        sep = seps[0]
        next_seps = seps[1:]
        
        # If separator is empty string, chunk by raw character index blocks
        if sep == "":
            parts = []
            start = 0
            while start < len(txt):
                parts.append(txt[start:start + chunk_size])
                start += chunk_size
            return parts
            
        parts = txt.split(sep)
        splits = []
        for i, part in enumerate(parts):
            if i > 0:
                splits.append(sep)
            splits.extend(_split_text(part, next_seps))
        return splits

    raw_splits = _split_text(text, separators)
    
    # Trace character indices of each split chunk to track exact offsets
    positioned_splits = []
    curr_idx = 0
    for split in raw_splits:
        s_len = len(split)
        if split != "":
            positioned_splits.append((split, curr_idx, curr_idx + s_len))
        curr_idx += s_len
        
    if not positioned_splits:
        return []

    # Merge splits into chunks
    chunks = []
    current_splits = []
    current_len = 0
    
    for split, start, end in positioned_splits:
        split_len = len(split)
        
        # If adding the split exceeds size limits, finalize current chunk
        if current_splits and (current_len + split_len > chunk_size):
            chunk_content = "".join([s[0] for s in current_splits]).strip()
            if chunk_content:
                chunks.append({
                    "text_content": chunk_content,
                    "char_start": current_splits[0][1],
                    "char_end": current_splits[-1][2]
                })
            
            # Backtrack splits to maintain the requested overlap
            overlap_splits = []
            overlap_len = 0
            for s, s_start, s_end in reversed(current_splits):
                if overlap_len + len(s) <= chunk_overlap:
                    overlap_splits.insert(0, (s, s_start, s_end))
                    overlap_len += len(s)
                else:
                    break
            
            current_splits = overlap_splits
            current_len = overlap_len
            
        current_splits.append((split, start, end))
        current_len += split_len
        
    # Append the remaining splits
    if current_splits:
        chunk_content = "".join([s[0] for s in current_splits]).strip()
        if chunk_content:
            chunks.append({
                "text_content": chunk_content,
                "char_start": current_splits[0][1],
                "char_end": current_splits[-1][2]
            })
            
    return chunks

def process_document(
    pages: List[Dict[str, Any]],
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP
) -> List[Dict[str, Any]]:
    """
    Cleans text page-by-page and segments pages into indexable chunks.
    Assigns sequential chunk indexes to the entire document.
    """
    all_chunks = []
    chunk_index = 0
    
    for page_data in pages:
        page_num = page_data["page_number"]
        raw_text = page_data["text"]
        
        cleaned = clean_text(raw_text)
        if not cleaned:
            continue
            
        page_chunks = split_text_into_chunks(cleaned, chunk_size, chunk_overlap)
        
        for chunk in page_chunks:
            all_chunks.append({
                "chunk_index": chunk_index,
                "text_content": chunk["text_content"],
                "page_number": page_num,
                "char_start": chunk["char_start"],
                "char_end": chunk["char_end"]
            })
            chunk_index += 1
            
    return all_chunks
