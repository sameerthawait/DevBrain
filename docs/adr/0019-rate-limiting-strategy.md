# ADR 0019: Rate Limiting Strategy

## Context
Preventing API abuse and protecting downstream model inference services requires structured rate limiters.

## Decision
We enforce a sliding window rate limiter backed by Upstash Redis sorted sets. The default is set to 20 requests per minute per authenticated user. When exceeded, the system blocks the request and replies with HTTP status 429 and standard `Retry-After` headers.

## Alternatives
*   **Token Bucket Algorithm**: Harder to implement atomically in Redis without complex Lua scripting.
*   **Fixed Window Counter**: Vulnerable to traffic bursts at the edges of the window frame.

## Trade-offs & Consequences
*   **Pros**: Highly accurate; completely atomic via Redis pipeline commands; minimal latency overhead (<10ms).
*   **Cons**: Introduces dependency on Redis. Outages fallback gracefully to allow requests.

## Migration Strategy
Call `checkRateLimit(userId)` inside all ingress Next.js routes.
