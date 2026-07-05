# ADR-0008: HNSW Indexing for Vector Similarity Searches

## Decision
We select **HNSW (Hierarchical Navigable Small World)** indexing over IVFFlat for our vector similarity query fields.

## Context
High-dimensional similarity searches suffer from performance degradation as the row count scales. A raw sequential scan (`seq scan`) calculates distance on every row, resulting in $O(N)$ execution times. An index is required to execute approximate nearest neighbor (ANN) lookups efficiently.

## Alternatives Considered
1. **IVFFlat (Inverted File with Flat Compression)**: Divides vectors into clusters. It requires periodic re-indexing and training as the distribution changes, and suffers from recall decay.
2. **HNSW**: Builds a multi-layer graph. It provides better recall/latency trade-offs and does not require a training step.

## Trade-offs & Selection Rationale
*   **Query Performance**: HNSW provides significantly faster search query latencies at high concurrency workloads compared to IVFFlat.
*   **Zero Training overhead**: Unlike IVFFlat, which requires a pre-built cluster configuration and list of centroids, HNSW dynamically updates its graph index with each new insert without performance degradation.
*   **Build Cost**: HNSW has a higher build-time latency and index size footprint compared to IVFFlat. Given that our memory records grow incrementally, this build-time cost is acceptable in return for optimal search speed.

## Consequences
*   **Index configuration**: We index using the `vector_cosine_ops` operator class.
*   **Query tuning**: Developers can control query speed vs. recall accuracy via postgres parameters like `hnsw.ef_search` during sessions.
