# ADR-0009: Advisory Locking for Schema Migrations

## Decision
We select **PostgreSQL Advisory Locks** (using a static lock ID `987654321`) to serialize database migrations.

## Context
In serverless hosting environments (such as Vercel or AWS Lambda), multiple application container instances can spin up concurrently. If database migrations run automatically during start/cold start phases, multiple instances might attempt to apply SQL migrations simultaneously, leading to lock contention, migration failures, or schema corruption.

## Alternatives Considered
1. **Drizzle Kit Push**: Dynamic synchronization during builds. This is unsafe for production as it does not capture explicit historic migrations.
2. **Dedicated CLI Deployment Step**: Executing migrations only inside CI/CD CD pipelines (e.g. GitHub Actions). While preferred, this requires credentials with high privileges to be exposed directly inside external CI run environments.
3. **Database Advisory Locks**: Application-driven synchronization using Postgres' session-level advisory locking primitives.

## Trade-offs & Selection Rationale
*   **Safety**: An advisory lock is exceptionally fast, lightweight, and managed directly by the database engine. If one container is running migrations, all other booting containers blocking on the same lock ID will pause until the lock is released.
*   **Simplicity**: Avoids configuring external orchestration tools. The locking logic is self-contained within our codebase.

## Consequences
*   **Unpooled Connection Requirement**: Advisory locks are session-scoped. They must be executed over an unpooled database connection. Using a connection pooler (like PgBouncer in transaction mode) will lead to locks being randomly assigned or lost across transactions.
*   **Connection Limit**: The migration client configuration enforces `max: 1` to guarantee the lock remains bound to the active transaction session lifecycle.
