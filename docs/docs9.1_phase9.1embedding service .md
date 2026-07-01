### 9.1 Embedding Service

#### Objective

The Embedding Service converts extracted note text into dense vector representations (embeddings) using a pre-trained Sentence Transformer model. These embeddings capture the semantic meaning of the text and enable intelligent similarity search instead of simple keyword matching.

#### Model

* Model: all-MiniLM-L6-v2
* Framework: Sentence Transformers
* Embedding Dimension: 384

#### Responsibilities

* Load the embedding model once during application startup.
* Generate embeddings for a single text document.
* Generate embeddings for multiple documents in batch.
* Return embeddings in NumPy array format for downstream processing.

#### Input

* Plain text extracted from uploaded notes.

#### Output

* 384-dimensional embedding vector.

#### Workflow

1. Receive cleaned note text.
2. Pass text to the Sentence Transformer model.
3. Generate semantic embedding.
4. Return embedding to the Vector Store module.

#### Future Enhancements

* GPU acceleration.
* Embedding caching.
* Multiple embedding model support.
* Batch optimization for large datasets.
