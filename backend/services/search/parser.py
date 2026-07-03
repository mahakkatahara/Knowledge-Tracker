import io
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def extract_text_from_pdf(file_content: bytes) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page from PDF binary data.
    Returns a list of dictionaries with page numbers (1-indexed) and text content.
    """
    pages = []
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_content))
        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            text = page.extract_text()
            # If extraction yields nothing, keep it as empty string
            pages.append({
                "page_number": page_num,
                "text": text.strip() if text else ""
            })
    except Exception as e:
        logger.error("Failed to parse PDF content: %s", str(e), exc_info=True)
        raise ValueError(f"Invalid or corrupt PDF file: {str(e)}")
    return pages

def extract_text_from_text_file(file_content: bytes) -> List[Dict[str, Any]]:
    """
    Extracts text from plain text or Markdown files.
    Treats the entire file as a single page (page 1).
    """
    try:
        # Attempt UTF-8 decode, fallback to ISO-8859-1 if needed
        try:
            text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            text = file_content.decode("latin-1")
        
        return [{
            "page_number": 1,
            "text": text.strip()
        }]
    except Exception as e:
        logger.error("Failed to parse text file: %s", str(e), exc_info=True)
        raise ValueError(f"Invalid text file encoding: {str(e)}")

def extract_document_text(file_content: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Extracts text from a document based on its file extension.
    Supported extensions: .pdf, .txt, .md
    """
    ext = filename.split(".")[-1].lower()
    
    if ext == "pdf":
        # Additional safety check for PDF header
        if not file_content.startswith(b"%PDF"):
            raise ValueError("File extension is .pdf but binary content does not match %PDF signature.")
        return extract_text_from_pdf(file_content)
    elif ext in ["txt", "md"]:
        return extract_text_from_text_file(file_content)
    else:
        raise ValueError(f"Unsupported file format: .{ext}. Only PDF, TXT, and MD are supported.")
