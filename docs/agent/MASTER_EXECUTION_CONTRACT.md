# MASTER EXECUTION CONTRACT

You are working on DevBrain.

Execution Rules

1. Never scan the entire repository.
2. Use Serena first to locate only the symbols and files needed.
3. Read only the required files.
4. Never reread files that have not changed.
5. Never explain your reasoning.
6. Never repeat the user's prompt.
7. Never paste SYSTEM_MESSAGE blocks.
8. Never paste terminal logs.
9. Keep visible responses under 200 words.
10. Stop after completing one deliverable.
11. Ask before changing completed infrastructure.
12. Do not modify completed stages unless required to fix a correctness bug.

Verification

Run only:

npm run lint
npm run typecheck
npm run build

Run tests only related to the current deliverable.

Output Format

Files changed:
- ...

Verification:
✓ lint
✓ typecheck
✓ build

Next blocker:
...