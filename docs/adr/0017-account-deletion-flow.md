# ADR 0017: Account Deletion Flow

## Context
Providing developers the ability to delete their profile and purge all vector database indexes is critical for privacy compliance.

## Decision
We implement a secure cascade data deletion path:
1. Double confirmation check (typing "DELETE" override phrase).
2. Invoke `DELETE /api/user/delete` with session bearer token validation.
3. Purge PostgreSQL user records which automatically triggers ON DELETE CASCADE constraints across projects, conversations, messages, document chunks, and memory facts.

## Alternatives
*   **Soft Deletion (IsDeleted flag)**: Retains vectors and document chunks, failing complete privacy purging requirements.
*   **Manual Admin Console Request**: Restricts user autonomy.

## Trade-offs & Consequences
*   **Pros**: Instant and guaranteed removal of all vectorized assets; clean database storage states.
*   **Cons**: Data is completely unrecoverable post-deletion.

## Migration Strategy
Ensure all foreign key constraint declarations specify `onDelete: "cascade"`.
