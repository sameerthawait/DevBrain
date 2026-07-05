# ADR-002: Object Relational Mapper (Drizzle ORM)

## Decision
We select **Drizzle ORM** as the database query builder and schema migration management tool.

## Context
Next.js serverless functions require fast initialization and database queries. An ORM is needed to translate TypeScript types into database definitions, manage schemas declaratively, and execute transactional operations.

## Alternatives Considered
1. **Prisma**: A highly popular TypeScript ORM utilizing a custom Rust-based query engine binary.
2. **Kysely**: A type-safe SQL query builder without a migration management layer.
3. **Raw SQL (pg-promise / pg)**: Direct text-based queries without type generation.

## Trade-offs & Selection Rationale
*   **Performance (Drizzle vs. Prisma)**: Prisma uses a heavy native engine binary. In serverless edge and lambda contexts, initializing this binary introduces a noticeable cold-start penalty (often $>1.5$s latency spikes). Drizzle is a lightweight, pure-JavaScript query builder that executes queries with near-zero overhead.
*   **pgvector Compatibility**: Drizzle has native support for `pgvector` columns (`vector`) and operators (like `<=>` cosine distance), whereas Prisma requires custom extensions or raw query wrappers to query vector data.
*   **Type Safety**: Drizzle translates database schema definitions directly into TypeScript types without code generation steps, simplifying local setups.

## Consequences
*   **TypeScript Declarative Schema**: All tables must be declared in `/lib/db/schema.ts` and managed via Drizzle migrations.
*   **Learning Curve**: Developers must write queries using Drizzle's `db.select()` or relational query APIs instead of traditional SQL text or standard Prisma queries.
