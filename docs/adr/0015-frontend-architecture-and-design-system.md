# ADR 0015: Frontend Architecture and Design System

## Context
Choosing the right styling paradigm is critical to ensuring team velocity and maintaining clean code layout design boundaries.

## Decision
We enforce a structured TailwindCSS-based layout stylesheet with system css variables inside `app/globals.css`. Design visual language is strictly aligned with Linear/Apple/Notion minimalist slate grays, avoiding neon colors or cyberpunk interfaces.

## Alternatives
*   **Tailwind Inline Classes Only**: Results in cluttered code layouts and inconsistent radius/color variables.
*   **Material UI / Chakra UI**: Heavy bundle sizes and visual styling does not reflect custom developer utility aesthetic choices.

## Trade-offs & Consequences
*   **Pros**: Complete customizability; incredibly lightweight stylesheet bundles; fully responsive and fast loads.
*   **Cons**: Requires structured CSS class definition guidelines.

## Migration Strategy
Reference design tokens (e.g. `--background`, `--card-bg`) inside all sub-components.
