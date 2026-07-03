# ADR-001: PostgreSQL Provider Selection (Supabase)

## Decision
We select **Supabase** as the PostgreSQL database provider for DevBrain, running with the `pgvector` extension activated.

## Context
DevBrain requires an ACID-compliant database to house structured relational developer facts, message history, user limits, and document chunk records, in addition to vector representations of code and text segment embeddings. We need a serverless-compatible hosting option that provides:
1. Native support for the `pgvector` extension.
2. Connection pooling capabilities to handle connection spikes in serverless environments.
3. Minimal connection and scaling overhead.

## Alternatives Considered
1. **Neon**: Fully serverless PostgreSQL with scale-to-zero capabilities and built-in connection poolers.
2. **Pinecone + Standalone PostgreSQL**: Splitting vector data into a dedicated vector store (Pinecone) and relational metadata into standard Postgres.
3. **AWS RDS (Aurora PostgreSQL)**: Enterprise-managed instances.

## Trade-offs & Selection Rationale
*   **Supabase vs. Neon**: Both Neon and Supabase are excellent Postgres hosts with `pgvector` support. Supabase was chosen due to its integration with local developer tools, simple dashboard access, and robust built-in transactional connection pooling.
*   **Unified Postgres vs. Hybrid (Pinecone + PG)**: Splitting vectors and metadata requires two-phase commits to keep indexes synchronized, introducing complex edge failure modes (e.g. vector written but relational metadata write fails). Keeping embeddings directly in PostgreSQL using `pgvector` guarantees transactional consistency.

## Consequences
*   **Connection Management**: Next.js Serverless functions must connect using the transactional connection pooler on port 6543 (with prepared statements disabled, `prepare: false`) to avoid connection exhaustion.
*   **Migration Management**: Schema migrations must bypass the pooler and connect directly to the database on port 5432 to obtain transaction and session locks needed to safely alter schemas.
*   **Vector Search Performance**: As embedding collections grow, we must configure HNSW indexes on `pgvector` columns to maintain low search latencies ($<100$ms).
