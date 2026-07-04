# ADR-0011: Background Processing Strategy

## Status
Accepted

## Context
DevBrain requires an asynchronous background processing pipeline for document ingestion. Ingestion operations involve file parsing, semantic chunking, and multiple synchronous embedding and decision classification network requests to NVIDIA NIM. These operations cannot block the Next.js API route lifecycle, which has strict serverless function execution timeouts (typically 15s to 60s on Vercel). We must offload this work to a durable asynchronous queue and background worker model.

## Proposed Strategy
We select **BullMQ + Upstash Redis** as the queueing and job distribution framework, configured with an external background worker.

### Justification
1.  **Guaranteed Execution Limits**: BullMQ uses Redis key-value storage and Lua scripting to provide reliable queueing state transitions (queued, active, completed, failed, delayed) with strong transaction-like safety guarantees.
2.  **Compatibility with Vercel Execution Model**: Next.js serverless API handlers on Vercel cannot run background listener loops because Vercel freezes or terminates container runtime environments immediately after the HTTP response payload is returned. Therefore, the Next.js API route will act strictly as a queue **Producer** (instantiated with a short-lived connection client), while a persistent worker process (hosted on a continuous compute instance, such as a VPS, Vercel Background Jobs/Cron, or Docker container) acts as the **Consumer** to pull and process tasks.
3.  **Advanced Retry and Rate-Limiting Controls**: BullMQ provides direct support for configurable exponential backoffs, dead-letter storage, rate-limiting, parent-child job dependencies, and concurrency controls out of the box.

## Trade-offs
*   **Hosting Overhead**: Unlike pure serverless solutions (like Upstash QStash), BullMQ requires a persistent Redis socket connection and a long-lived Node.js process (the worker) to execute job loops reliably.
*   **Upstash Connection Limits**: Cloud Redis servers enforce maximum concurrent connection limits. The worker concurrency must be throttled to prevent exceeding pooler quotas.

## Migration Considerations
If serverless worker architectures are adopted in the future, the BullMQ Producer logic can be transitioned to invoke Upstash QStash HTTP targets directly, invoking stateless serverless handler APIs instead of pulling from a centralized queue.
