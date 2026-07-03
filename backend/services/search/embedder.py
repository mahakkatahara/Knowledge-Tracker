import logging
from typing import List
from backend.config import EMBEDDING_MODEL_NAME

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Singleton service handling lazy-loading of the SentenceTransformer embedding model.
    Forces execution on CPU to maintain predictability and control resource consumption.
    """
    _instance = None
    _model = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(EmbeddingService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def get_model(self) -> "SentenceTransformer":
        """
        Lazy-loads the embedding model on CPU.
        """
        if self._model is None:
            try:
                logger.info("Initializing SentenceTransformer model: %s on CPU", EMBEDDING_MODEL_NAME)
                from sentence_transformers import SentenceTransformer
                # Force CPU device mapping as required
                self._model = SentenceTransformer(EMBEDDING_MODEL_NAME, device="cpu")
            except Exception as e:
                logger.error("Failed to load SentenceTransformer model %s: %s", EMBEDDING_MODEL_NAME, str(e), exc_info=True)
                raise RuntimeError(f"Could not initialize embedding model: {str(e)}")
        return self._model

    def embed_text(self, text: str) -> List[float]:
        """
        Generates a vector embedding for a single text string.
        """
        model = self.get_model()
        embedding = model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generates vector embeddings for a list of text strings in batch.
        Uses a standard batch size of 32 for optimal CPU vectorized computation.
        """
        if not texts:
            return []
        model = self.get_model()
        embeddings = model.encode(
            texts,
            batch_size=32,
            show_progress_bar=False,
            convert_to_numpy=True
        )
        return embeddings.tolist()
