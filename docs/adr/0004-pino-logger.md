# ADR-004: Logging Strategy (Pino Logger)

## Decision
We select **Pino** as the primary logging framework to produce structured JSON logs.

## Context
Production observability requires structured, scrapable log formats. Standard `console.log` statements are non-structured, lack context, and introduce performance overhead due to synchronous `stdout` writes in some environments.

## Alternatives Considered
1. **Winston**: A highly customizable, feature-rich logger.
2. **Roarr**: A lightweight JSON logger.
3. **Console Logs**: Default Node.js print statements.

## Trade-offs & Selection Rationale
*   **Performance**: Pino is documented as one of the fastest JSON loggers in Node.js, using asynchronous chunk writing techniques that minimize event loop blocking.
*   **Structured Output**: Every log entry is formatted as a single JSON object containing timestamp, severity level, message, and metadata, making it immediately indexable by log ingestion systems (Datadog, Axiom, AWS CloudWatch).
*   **Correlation Integration**: Pino integrates cleanly with Node's `AsyncLocalStorage` to append request IDs automatically.

## Consequences
*   **Structured Logger Usage**: The standard `console.log` statements are banned in production code. All code must import and call `logger` from `@/lib/logger`.
*   **Development Output**: Local JSON logs can be hard to read during development. Developers can pipe logs to `pino-pretty` locally if desired.
