import pytest

@pytest.fixture
def sample_topics():
    """
    Returns the core sample dataset specified in Phase 3 Spec and mockData.js.
    """
    return [
        {
            "id": "topic-1",
            "title": "Dynamic Programming",
            "lastStudied": "2026-06-15",
            "duration": 120,
            "confidenceScore": 2,
            "quizScore": 60,
            "revisionCount": 1,
            "difficulty": "Hard"
        },
        {
            "id": "topic-2",
            "title": "Graph Algorithms",
            "lastStudied": "2026-06-12",
            "duration": 90,
            "confidenceScore": 3,
            "quizScore": 70,
            "revisionCount": 2,
            "difficulty": "Hard"
        },
        {
            "id": "topic-4",
            "title": "Operating Systems - Virtual Memory",
            "lastStudied": "2026-06-10",
            "duration": 80,
            "confidenceScore": 1,
            "quizScore": 40,
            "revisionCount": 0,
            "difficulty": "Hard"
        },
        {
            "id": "topic-5",
            "title": "React Lifecycle & Hooks",
            "lastStudied": "2026-06-18",
            "duration": 60,
            "confidenceScore": 4,
            "quizScore": 88,
            "revisionCount": 3,
            "difficulty": "Medium"
        }
    ]


@pytest.fixture(autouse=True)
def reset_embedding_service():
    """
    Autouse fixture to reset EmbeddingService singleton state between tests.
    Prevents mock leakage when SentenceTransformer is mocked differently across test runs.
    """
    from backend.services.search.embedder import EmbeddingService
    EmbeddingService._instance = None
    EmbeddingService._model = None
    yield
    EmbeddingService._instance = None
    EmbeddingService._model = None

