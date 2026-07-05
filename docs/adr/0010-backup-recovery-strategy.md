# ADR-0010: Backup and Recovery Strategy

## Decision
We delegate database backup and recovery operations to the native capabilities of our PostgreSQL hosting provider (**Supabase** / physical pg_dump snapshots).

## Context
Production databases require structured backup schedules to meet organizational compliance and ensure data can be recovered to a stable state in the event of hardware failures, corrupted states, or security incidents.

## Alternatives Considered
1. **Application-Level Cron Backups**: Setting up node cron tasks to dump tables. This introduces significant CPU/memory spikes, disk IO overhead on application nodes, and requires configuring storage buckets.
2. **Infrastructure-Managed Backups**: Leveraging hosting provider managed snapshots.

## Trade-offs & Selection Rationale
*   **Zero Performance Impact**: Host-level backups are performed on replica systems or snapshot volumes, leaving production instance resources completely free.
*   **Reliability**: Automated provider systems guarantee backups run on schedule and provide point-in-time recovery (PITR) features.

## Consequences
*   **RPO / RTO Rules**:
    *   **Recovery Point Objective (RPO)**: 24 hours (for standard daily backups) or 5 minutes (if Point-in-Time Recovery is enabled).
    *   **Recovery Time Objective (RTO)**: Under 2 hours.
*   **Verification**: Backups must be tested quarterly by restoring snapshot dumps onto a temporary staging database to verify referential integrity.
