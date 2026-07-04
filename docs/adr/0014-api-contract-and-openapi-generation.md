# ADR 0014: API Contract and OpenAPI Generation

## Context
Exposing robust, typed, and well-documented API contracts is essential for front-end integration and third-party developers.

## Decision
We enforce dynamic OpenAPI generation derived from Zod schemas and expose the resulting schema at `GET /api/openapi.json`. Every route handler enforces request query/body constraints using these schema models.

## Alternatives
*   **Manual Swagger Specification**: Highly error-prone and leads to schema drift.
*   **tRPC / ts-rest**: Requires a heavy dependency layer and limits pure JSON/REST accessibility.

## Trade-offs & Consequences
*   **Pros**: Zero manual synchronization effort; guarantees documentation matches code.
*   **Cons**: Exposing complex nested object structures requires structured Zod-to-OpenAPI translation helpers.

## Migration Strategy
Directly register new routes and types under `/api/openapi.json` paths mapping rules.
