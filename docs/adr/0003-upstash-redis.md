# ADR-003: Upstash Redis Selection

## Decision
We select **Upstash Redis** as our key-value cache, rate-limiting registry, and temporary session manager.

## Context
A production RAG application requires caching responses (semantic caches) and rate-limiting incoming requests. In serverless environments, local memory is ephemeral and cannot be shared across lambdas, requiring a centralized key-value store.

## Alternatives Considered
1. **Self-Hosted Redis**: Running Redis in a Docker container on a virtual machine (AWS EC2 / Fly.io).
2. **Elasticache (AWS Redis)**: Managed enterprise Redis clusters.
3. **Upstash Redis**: Serverless Redis accessible via HTTP/REST.

## Trade-offs & Selection Rationale
*   **Serverless-Safe (REST vs. TCP)**: Standard Redis clients connect via long-lived TCP sockets. If Next.js scales to hundreds of concurrent serverless functions, TCP connections will saturate Redis limits instantly. Upstash Redis allows query requests over a serverless-safe REST API using HTTP connection pooling, bypassing TCP connection bottlenecks entirely.
*   **Scale and Cost**: Upstash Redis offers a pay-as-you-go pricing model with a generous free tier, matching the serverless cost profile of DevBrain.
*   **Latency**: REST requests introduce minor network overhead compared to pure TCP, but Upstash REST latency remains low ($<15$ms), which is acceptable for rate-limiting and query cache lookups.

## Consequences
*   **Client Implementation**: We must use `@upstash/redis` REST SDK to query and update Redis keys.
*   **Key Design**: Keys must be managed using namespaces and explicit TTL (Time-To-Live) configurations to prevent memory bloat.
