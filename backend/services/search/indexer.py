import os
import logging
from typing import List
import faiss
import numpy as np
from backend.config import FAISS_INDEX_PATH
from backend.services.search.embedder import EmbeddingService

logger = logging.getLogger(__name__)

class FAISSIndexManager:
    """
    Manages loading, persistence, and additions for the FAISS vector index.
    Wraps IndexFlatIP (Inner Product) inside IndexIDMap2 to allow mapping
    custom 64-bit integer IDs (SQLite chunk IDs) directly to vector values.
    """
    def __init__(self, index_path: str = FAISS_INDEX_PATH):
        self.index_path = index_path
        self.index = None
        self.embedder = EmbeddingService()
        self.load_or_create()

    def _get_embedding_dimension(self) -> int:
        """
        Retrieves the target dimension from the active embedding model.
        """
        model = self.embedder.get_model()
        return model.get_sentence_embedding_dimension()

    def load_or_create(self):
        """
        Loads the index from disk or creates a new one if it does not exist.
        """
        if os.path.exists(self.index_path):
            try:
                logger.info("Loading existing FAISS index from %s", self.index_path)
                self.index = faiss.read_index(self.index_path)
            except Exception as e:
                logger.warning("Failed to read FAISS index from %s (%s). Recreating a fresh index.", self.index_path, str(e))
                self.index = self._create_flat_ip_index()
        else:
            logger.info("FAISS index file not found. Creating a fresh index.")
            self.index = self._create_flat_ip_index()

    def _create_flat_ip_index(self) -> faiss.IndexIDMap2:
        """
        Constructs a new Flat Inner Product (cosine similarity) index wrapped in ID mapping.
        """
        dimension = self._get_embedding_dimension()
        logger.info("Creating fresh IndexFlatIP index with dimension %s wrapped in IndexIDMap2", dimension)
        base_index = faiss.IndexFlatIP(dimension)
        id_index = faiss.IndexIDMap2(base_index)
        return id_index

    def add_vectors(self, chunk_ids: List[int], embeddings: List[List[float]]):
        """
        Adds embeddings to the index mapped to SQLite chunk IDs.
        Saves updated index to disk automatically.
        """
        if not chunk_ids or not embeddings:
            return
        
        if len(chunk_ids) != len(embeddings):
            raise ValueError("Size mismatch between chunk IDs and embeddings.")

        # Convert to float32 numpy array
        vectors_np = np.array(embeddings, dtype=np.float32)
        # Normalize vectors for Cosine Similarity (Inner Product of normalized vectors)
        faiss.normalize_L2(vectors_np)
        
        ids_np = np.array(chunk_ids, dtype=np.int64)
        
        logger.info("Adding %s vectors to FAISS index", len(chunk_ids))
        self.index.add_with_ids(vectors_np, ids_np)
        self.save()

    def remove_vectors(self, chunk_ids: List[int]):
        """
        Removes vectors from the index by their chunk IDs.
        Saves updated index to disk automatically.
        """
        if not chunk_ids:
            return
        
        ids_np = np.array(chunk_ids, dtype=np.int64)
        logger.info("Removing %s vectors from FAISS index", len(chunk_ids))
        self.index.remove_ids(ids_np)
        self.save()

    def save(self):
        """
        Serializes and writes the FAISS index to the persistent path.
        """
        try:
            # Ensure folder exists
            dir_name = os.path.dirname(self.index_path)
            if dir_name:
                os.makedirs(dir_name, exist_ok=True)
            logger.info("Saving FAISS index binary to %s", self.index_path)
            faiss.write_index(self.index, self.index_path)
        except Exception as e:
            logger.error("Failed to persist FAISS index to disk: %s", str(e), exc_info=True)
            raise RuntimeError(f"Failed to save vector index to disk: {str(e)}")
            
    def get_indexed_ids(self) -> List[int]:
        """
        Helper method to retrieve all IDs currently tracked in the index.
        Useful for auditing or vector synchronization testing.
        """
        # IndexIDMap2 houses mapping vector inside its id_map array wrapper
        id_map = self.index.id_map
        # Convert index structure array to standard Python list
        ids = [int(id_map.at(i)) for i in range(id_map.size())]
        return ids
