# ADR 0020: Deployment & Rollback Strategy

## Context
Deploying next-gen LLM applications requires phased rollout mechanisms to guarantee high availability and prompt recovery in case of regressions.

## Decision
We choose Vercel staged deployment pipelines:
1. Build and compile preview deployments for pull requests.
2. Run smoke tests verifying DB, Redis, and health checks before routing.
3. Automatically roll back (reverting routing alias to previous deployment) on health check failures or high error rate spikes.

## Alternatives
*   **Docker Container Deployments on AWS ECS**: Increases DevOps operational management overhead.
*   **Direct Production Push**: Risk of high downtime.

## Trade-offs & Consequences
*   **Pros**: Fast rollout alias shifting; decoupled preview setups; completely automated rollback paths.
*   **Cons**: Vercel limits custom container configs.

## Migration Strategy
Integrate preview test databases and schema migrations checks in PR build checks.
