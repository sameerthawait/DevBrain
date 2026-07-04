# ADR-0012: Ingestion Pipeline & RAG Storage Strategy

## Status
Accepted

## Context
DevBrain requires a secure, high-concurrency ingestion pipeline to parse, chunk, embed, classify, and persist developer knowledge base elements. The system must guarantee data consistency, idempotency, failure isolation, and transparent cost auditing under load.

## Decisions

### 1. Parser Architecture
*   **Design**: Expose a unified `Parser` interface in `lib/rag/parsers/types.ts`.
*   **MIME Mapping**: Registry pattern mappings in `lib/rag/parsers/registry.ts`.
*   **PlainTextParser**: First-class support for `.txt` files with line/character extraction.

### 2. Chunking Strategy
*   **Parameters**: Approx 400 tokens (1600 characters) chunk size with 50 tokens (200 characters) overlap.
*   **Boundary Preserving**: Chunker respects double and single newline paragraph boundaries to preserve contextual cohesion before falling back to character slices on extremely long tokens.

### 3. Retry Policy & Dead Letter Queue (DLQ)
*   **Exponential Backoff**: Transient errors (429, 5xx, timeouts) retry up to 3 times with exponential backoff and random jitter.
*   **No-Retry Failures**: Payload validation (400), authentication (401/403), or invalid mime types fail immediately and are not retried.
*   **DLQ**: Permanently failing jobs (attempts exceeded or consecutive poison failures) are stored in BullMQ's default failure queue with full error stack traces preserved for administrative retry operations.

### 4. Idempotency Strategy
*   **Unique Hashes**: Deterministic job/chunk keys generated using SHA-256 hashes of `content` combined with `userId` or `conversationId` to prevent duplicate writes and race-conditions.

### 5. Cost Tracking & Metadata Strategy
*   **Cost Audit**: Expose mathematical pricing lookup models in `lib/rag/cost.ts` mapping input/output tokens used to estimated USD pricing limits. Usage is persisted dynamically in `monthlyTokenUsage` under the `users` table and written to the structured audit log history in `user_memories`.
*   **Metadata**: Persist parser signatures, model identifiers, chunk indexes, and mime-types in database fields to support future migrations.

### 6. Decision Classification
*   **Nemotron Nano**: Chunks matching predefined rules or processed via NVIDIA Nemotron Nano are classified under specific engineering tags (ADR, Bug Fix, Design Decision, etc.). If classification fails, the pipeline logs a warning and continues.

## Trade-offs & Migration Paths
*   **Mock Fallbacks**: Local test runs use deterministic 768-dimension vector mocks if external NVIDIA gateway requests fail (e.g., DNS or 404), preserving test isolation.
*   **Future Models**: The metadata schema uses generic JSON objects to support migration to newer embedding models (e.g. 1024 or 4096 dimensions) without structural alterations.
