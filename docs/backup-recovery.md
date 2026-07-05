# Database Backup & Recovery Guide

This guide documents the production backup policies, objectives, restore procedures, and validation checks for the DevBrain PostgreSQL database hosted on **Supabase**.

---

## 1. Backup Policy & Infrastructure

Supabase manages database backups at the physical and WAL (Write-Ahead Logging) levels. This eliminates CPU/resource overhead on the primary transactional instance during backup windows.

*   **Backup Type**: Physical snapshots and continuous Write-Ahead Log (WAL) archiving.
*   **Backup Host**: Backups are stored in isolated Amazon S3 storage buckets managed by Supabase, located in the same region as the primary database (`ap-southeast-1`).
*   **Backup Schedule**: 
    *   **Automated daily backup**: Initiated daily during low-traffic windows (typically 00:00 UTC). Backups are retained for 7 to 30 days depending on the project tier.
    *   **Continuous WAL archiving**: Every transaction log is archived to support Point-in-Time Recovery (PITR) up to the second.

---

## 2. Recovery Objectives

*   **Recovery Point Objective (RPO)**:
    *   *Definition*: The maximum acceptable period of data loss in a disaster.
    *   *Standard daily backup*: **24 hours**.
    *   *Point-in-Time Recovery (PITR)*: **5 minutes** (allows rolling back to any state within the retention window).
*   **Recovery Time Objective (RTO)**:
    *   *Definition*: The target time duration to restore service after database failure.
    *   *Target RTO*: **2 hours**.

---

## 3. Restore Procedures

### Option A: Restore via Supabase Dashboard (PITR / Daily Snapshot)

1.  Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navigate to **Project Settings** -> **Database** -> **Backups**.
3.  Choose either:
    *   **Point-in-Time Recovery (PITR)**: Select the exact date, hour, minute, and second you want to restore to.
    *   **Daily Backups**: Select the target backup snapshot from the list of daily snapshots.
4.  Click **Restore**. Note: Supabase will spin up a new database instance or overwrite the existing instance depending on configuration. Services will experience a brief downtime window during restoration.

### Option B: Manual Command Line Restore (pg_restore)

If you have a custom sql/dump file (e.g. created via `pg_dump`), restore it manually using standard PostgreSQL command-line utilities over the direct unpooled connection:

```bash
# 1. Clear existing schema (WARNING: This drops all existing tables)
psql "postgresql://postgres.ebodlufpffzeduhojfsk:<PASSWORD>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. Restore schema and data from backup dump file
pg_restore --no-owner --no-privileges --clean --if-exists \
  -d "postgresql://postgres.ebodlufpffzeduhojfsk:<PASSWORD>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres" \
  backup_dump.sql
```

---

## 4. Restore Verification Procedure

After any restore operation, the database state must be verified before traffic is redirected to the instance:

1.  **Run Schema Validations**: Confirm that all tables, foreign keys, and indexes exist.
    ```bash
    npx drizzle-kit check
    ```
2.  **Verify Vector Extension**: Confirm that the pgvector extension is present and can execute cosine similarity lookups.
3.  **Execute the Integration Test Suite**: Run the database integration tests to ensure CRUD and cascade operations function without errors.
    ```bash
    npm run test:db-integration
    ```

---

## 5. Disaster Recovery Considerations

*   **Geo-Redundancy**: Daily backups are replicated across multiple availability zones within the `ap-southeast-1` region by the cloud host.
*   **Read Replicas**: High-availability setups should configure a read replica in a different region (e.g., `us-east-1`) to enable fast failovers in the event of major AWS regional outages.
