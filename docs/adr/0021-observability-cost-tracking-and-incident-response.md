# ADR 0021: Observability, Cost Tracking & Incident Response

## Context
Aggregating LLM execution costs and defining incident recovery runbooks is necessary to prevent runaway budgets or service degradations.

## Decision
We enforce:
1. Structured JSON logging containing `requestId`, `correlationId`, and token latency statistics.
2. AI cost alerts (Warning at 75%, Critical at 90%, and Emergency at 100% of daily AI budget allocations).
3. Configured incident runbooks for PostgreSQL/Redis failures and NIM endpoint timeouts.

## Alternatives
*   **External telemetry collectors (Datadog, Dynatrace)**: Substantially increases subscription costs and operations complexity.
*   **Manual log parsing**: Slow response recovery times.

## Trade-offs & Consequences
*   **Pros**: Complete visibility over operational costs; fast incident recovery offsets; zero data privacy leaks.
*   **Cons**: Custom runbook maintenance efforts.

## Migration Strategy
Ensure all model inference calls log token counts and request contexts.
