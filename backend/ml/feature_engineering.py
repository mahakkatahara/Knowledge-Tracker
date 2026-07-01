def build_features(note_text: str):
    """
    Simple feature extractor for Knowledge Decay ML model.
    (Second year level - no heavy ML, just basic signals)
    """

    if not note_text:
        return {
            "length": 0,
            "word_count": 0,
            "avg_word_length": 0,
            "unique_words": 0
        }

    words = note_text.split()

    return {
        "length": len(note_text),
        "word_count": len(words),
        "avg_word_length": sum(len(w) for w in words) / len(words) if words else 0,
        "unique_words": len(set(words))
    }