import pytest
from unittest.mock import MagicMock, patch
from backend.services.search import parser, processor

def test_clean_text():
    # Test tabs and multiple spaces normalized to single space
    raw = "Hello   world \t from   Antigravity."
    assert processor.clean_text(raw) == "Hello world from Antigravity."

    # Test three or more linebreaks normalized to double linebreaks
    raw_breaks = "First line\n\n\n\nSecond line\n\n\nThird line"
    assert processor.clean_text(raw_breaks) == "First line\n\nSecond line\n\nThird line"

    # Empty string check
    assert processor.clean_text("") == ""
    assert processor.clean_text(None) == ""


def test_split_text_into_chunks_small():
    # Text shorter than chunk_size should return as a single chunk
    text = "Short text."
    chunks = processor.split_text_into_chunks(text, chunk_size=50, chunk_overlap=10)
    assert len(chunks) == 1
    assert chunks[0]["text_content"] == text
    assert chunks[0]["char_start"] == 0
    assert chunks[0]["char_end"] == len(text)


def test_split_text_into_chunks_sliding():
    # Simple sliding split on boundary
    text = "This is a long sentence that should be split into smaller blocks."
    # Set chunk_size=20, chunk_overlap=5
    chunks = processor.split_text_into_chunks(text, chunk_size=20, chunk_overlap=5)
    assert len(chunks) > 1
    
    # Assert start and end offsets boundaries
    for chunk in chunks:
        assert len(chunk["text_content"]) <= 20
        # Re-extract and match content
        extracted = text[chunk["char_start"]:chunk["char_end"]].strip()
        assert chunk["text_content"] == extracted


def test_split_text_into_chunks_backtrack_boundary():
    # Set separators to split nicely at newlines
    text = "Paragraph 1 content.\n\nParagraph 2 content."
    # If chunk_size is 30, it encompasses Paragraph 1 but not 2.
    # Without backtracking it might split in the middle of Paragraph 2.
    # Backtracking should find the double newline and split there.
    chunks = processor.split_text_into_chunks(text, chunk_size=30, chunk_overlap=5)
    assert len(chunks) == 2
    assert chunks[0]["text_content"] == "Paragraph 1 content."
    assert chunks[1]["text_content"] == "Paragraph 2 content."


def test_process_document():
    pages = [
        {"page_number": 1, "text": "Page one text content.\nWith multi-line info."},
        {"page_number": 2, "text": "Page two text content. Short page."}
    ]
    
    # Run processor
    chunks = processor.process_document(pages, chunk_size=30, chunk_overlap=5)
    
    assert len(chunks) >= 2
    # Verify sequential chunk indexing
    assert chunks[0]["chunk_index"] == 0
    assert chunks[1]["chunk_index"] == 1
    # Verify page numbers mapped correctly
    assert chunks[0]["page_number"] == 1
    assert chunks[-1]["page_number"] == 2


def test_parser_extract_text_txt():
    content = b"Hello world from text file."
    pages = parser.extract_document_text(content, "test.txt")
    assert len(pages) == 1
    assert pages[0]["page_number"] == 1
    assert pages[0]["text"] == "Hello world from text file."


def test_parser_unsupported_extension():
    content = b"some random binary"
    with pytest.raises(ValueError) as exc:
        parser.extract_document_text(content, "image.png")
    assert "Unsupported file format" in str(exc.value)


@patch("pypdf.PdfReader")
def test_parser_extract_text_pdf(mock_reader_cls):
    # Mocking pypdf PDF extraction behavior
    mock_page_1 = MagicMock()
    mock_page_1.extract_text.return_value = "Hello page one."
    mock_page_2 = MagicMock()
    mock_page_2.extract_text.return_value = "Hello page two."
    
    mock_reader = MagicMock()
    mock_reader.pages = [mock_page_1, mock_page_2]
    mock_reader_cls.return_value = mock_reader
    
    content = b"%PDF-mock-binary-content"
    pages = parser.extract_document_text(content, "test.pdf")
    
    assert len(pages) == 2
    assert pages[0]["page_number"] == 1
    assert pages[0]["text"] == "Hello page one."
    assert pages[1]["page_number"] == 2
    assert pages[1]["text"] == "Hello page two."


def test_splitter_very_small_document():
    # Character length 1
    text = "A"
    chunks = processor.split_text_into_chunks(text, chunk_size=10, chunk_overlap=2)
    assert len(chunks) == 1
    assert chunks[0]["text_content"] == "A"
    assert chunks[0]["char_start"] == 0
    assert chunks[0]["char_end"] == 1


def test_splitter_extremely_large_document():
    # 15,000 characters text block representing ~30 paragraphs
    paragraphs = [f"This is paragraph {i} containing repeating sentences to simulate text payload of size. " * 5 for i in range(30)]
    text = "\n\n".join(paragraphs)
    assert len(text) > 10000

    chunks = processor.split_text_into_chunks(text, chunk_size=500, chunk_overlap=50)
    assert len(chunks) > 20
    # Confirm offsets align exactly
    for chunk in chunks:
        assert len(chunk["text_content"]) <= 500
        original_slice = text[chunk["char_start"]:chunk["char_end"]].strip()
        assert chunk["text_content"] == original_slice


def test_splitter_unicode_text():
    # Non-english strings with emojis to test multi-byte character offset integrity
    text = "Hola mundo! नमस्ते दुनिया! 🌟\n\nSpanish and Hindi paragraph."
    chunks = processor.split_text_into_chunks(text, chunk_size=40, chunk_overlap=5)
    assert len(chunks) == 2
    assert "नमस्ते दुनिया! 🌟" in chunks[0]["text_content"]
    assert chunks[1]["text_content"] == "Spanish and Hindi paragraph."
    
    # Assert slice positions are byte-safe / character-offset safe (Python len counts unicode code points, not raw bytes)
    for chunk in chunks:
        extracted = text[chunk["char_start"]:chunk["char_end"]].strip()
        assert chunk["text_content"] == extracted


def test_splitter_empty_and_null_files():
    # Empty string should yield empty chunks
    assert processor.split_text_into_chunks("", chunk_size=100, chunk_overlap=10) == []
    # Null cases or white-space only text
    assert processor.clean_text(None) == ""
    assert processor.split_text_into_chunks("   \n   ", chunk_size=100, chunk_overlap=10) == []


@patch("pypdf.PdfReader")
def test_parser_pdf_blank_pages(mock_reader_cls):
    # Setup PDF with blank pages or extractable text as None
    mock_page_1 = MagicMock()
    mock_page_1.extract_text.return_value = ""  # Blank text
    mock_page_2 = MagicMock()
    mock_page_2.extract_text.return_value = "   "  # Whitespace only
    mock_page_3 = MagicMock()
    mock_page_3.extract_text.return_value = "Page three text."

    mock_reader = MagicMock()
    mock_reader.pages = [mock_page_1, mock_page_2, mock_page_3]
    mock_reader_cls.return_value = mock_reader

    content = b"%PDF-mock-binary-content"
    pages = parser.extract_document_text(content, "test.pdf")
    
    assert len(pages) == 3
    assert pages[0]["text"] == ""
    assert pages[1]["text"] == ""
    assert pages[2]["text"] == "Page three text."

    # Document processing should gracefully filter blank pages and index only page 3
    chunks = processor.process_document(pages, chunk_size=100, chunk_overlap=10)
    assert len(chunks) == 1
    assert chunks[0]["page_number"] == 3
    assert chunks[0]["text_content"] == "Page three text."

