# ADR-006: Secret Scanning Integration (Gitleaks)

## Decision
We select **Gitleaks** as our tool for static secret scanning in local pre-commit hooks and GitHub Actions CI pipelines.

## Context
Committing private API keys (`nvapi-`, `UPSTASH_REDIS_REST_TOKEN`), database credentials, or private configuration files (.env, service accounts) to a remote repository constitutes a major security incident. We must prevent these secrets from leaving developer environments and scan code on pull request events.

## Alternatives Considered
1. **TruffleHog**: A popular enterprise secret scanner analyzing commit histories and high-entropy strings.
2. **GitGuard**: Built-in secret detection tools.
3. **Gitleaks**: A fast, Go-based secret scanner matching regex signatures and key identifiers.

## Trade-offs & Selection Rationale
*   **Gitleaks vs. TruffleHog**: TruffleHog is exceptionally strong at finding leaked keys in historic commits by analyzing string entropy. However, entropy scanning in active code leads to high false-positive rates on random hashes, CSS class layouts, or system UUIDs, slowing down CI pipelines. Gitleaks specializes in signature matching, making it faster, predictable, and simple to run within GitHub Actions and local hooks.
*   **CI Run times**: Gitleaks has a dedicated GitHub Action (`gitleaks-action`) that runs in under 10 seconds, keeping PR check cycles fast.

## Consequences
*   **Pre-commit Hook**: Developers must execute Git hooks locally to scan files before staging.
*   **Pipeline Failures**: Pull requests containing hardcoded secret signatures will fail CI checks immediately, blocking merges.
