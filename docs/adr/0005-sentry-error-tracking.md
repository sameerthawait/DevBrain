# ADR-005: Error Tracking Integration (Sentry)

## Decision
We select **Sentry** as the centralized real-time application error monitoring platform.

## Context
Production incidents must be detected, categorized, and resolved proactively before developers report issues in chat. We require an observability platform that captures uncaught exceptions, stack traces, and runtime context.

## Alternatives Considered
1. **Log-based Alerts**: Setting up regex search triggers on logs (e.g., Datadog log alerts).
2. **Rollbar / Bugsnag**: Alternative application monitoring SDKs.
3. **No Centralized Tracker**: Relying strictly on container logs.

## Trade-offs & Selection Rationale
*   **Next.js First-Class support**: Sentry provides a dedicated `@sentry/nextjs` SDK that wraps client components, server actions, API routes, and edge middleware automatically.
*   **Context Gathering**: Sentry automatically captures breadcrumbs (e.g. recent HTTP requests, database actions, console messages) leading up to an error, lowering debugging latency.
*   **Performance Metrics**: Sentry also acts as a performance monitor (Vitals tracking, API latency spans), reducing tool fragmentation.

## Consequences
*   **Build-time Map Uploads**: Sentry automatically uploads source maps to resolve minified scripts.
*   **Error Bubbling**: Middleware and API routes must catch exceptions, report them to Sentry via `Sentry.captureException`, and return clean user-facing errors.
