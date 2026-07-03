# ADR-0007: pgvector Extension for Vector Storage

## Decision
We select the PostgreSQL **pgvector** extension as the primary mechanism for storing and performing similarity searches over semantic text embeddings.

## Context
DevBrain relies on retrieving code, decisions, and technical documentation via semantic search (RAG). To achieve this, text content is transformed into high-dimensional vector representations. We require a database storage mechanism that natively stores these vectors and supports efficient vector distance similarity queries directly in SQL.

## Alternatives Considered
1. **Dedicated Vector Database (Pinecone / Milvus / Qdrant)**: High performance, but introduces external network latency, additional operational cost, data sync complexities, and breaks transactional (ACID) safety.
2. **In-Memory Vector Search (faiss / hnswlib)**: Requires running sidecar indexing services, complicating container orchestration.
3. **pgvector extension**: Integrates directly within our existing Supabase PostgreSQL instance.

## Trade-offs & Selection Rationale
*   **ACID Compliance**: By storing vectors inside Postgres alongside relation metadata, we maintain full transaction consistency. Deleting a project automatically cascade-deletes its vector memory chunks inside the same transaction block.
*   **Query Simplicity**: Avoids API calls to an external service. Queries use standard SQL/Drizzle builders.
*   **Dimensionality and Distance**: Standardized on a 768-dimension configuration matching `nvidia/canonical-embeddings` using `cosine` distance metrics.

## Consequences
*   **Prerequisite Extension**: Every target PostgreSQL instance (local, CI, staging, production) must execute `CREATE EXTENSION IF NOT EXISTS vector;` before table creation.
*   **Type Binding**: Embeddings are defined in Drizzle using the custom `vector` column type.
