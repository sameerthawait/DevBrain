# ADR 0016: Theme & Component Accessibility

## Context
Providing dark/light theme switching and strong compliance with accessibility guidelines (WCAG 2.2 AA) is a requirement for modern enterprise software.

## Decision
We implement a unified React `ThemeProvider` context selector that handles Dark, Light, and System theme synchronizations. We enforce keyboard accessibility rules (`prefers-reduced-motion` resets, ARIA landmarks, dialog role validations, and keyboard-visible focus state rings).

## Alternatives
*   **Tailwind Dark Mode Only**: Harder to dynamically override based on user settings storage.
*   **Static Theme Sheets**: Causes hydration mismatch issues and flickers on rendering.

## Trade-offs & Consequences
*   **Pros**: Full accessibility compliance; responsive styles; settings modal integration.
*   **Cons**: Requires strict markup validation of HTML landmarks.

## Migration Strategy
Ensure all custom components mount inside `ThemeProvider` wrap wrappers.
