# WTS-FinCore UI Style Guide

This document serves as the central reference for the project's design system and component architecture.

## 1. Design Tokens

### Colors
We use a curated palette defined in `tailwind.config.ts`.
- **Primary**: `#0f172a` (Slate-900) for headers and core actions.
- **Accent**: Glassmorphism and subtle gradients for premium cards.
- **Semantic**:
  - Success (Green): Paid invoices, confirmed payments.
  - Destructive (Red): Deletion, errors, overdue alerts.
  - Warning (Amber): Partial payments, pending approvals.

### Typography
- **Primary Font**: `Inter` or `Geist` (Modern sans-serif).
- **Monospace**: `JetBrains Mono` or `Geist Mono` for transaction IDs and currency amounts.

---

## 2. Core Components

### Buttons (`@/components/ui/button`)
Standardized variants for consistent UX:
- `default`: Primary actions (Save, Submit).
- `outline`: Secondary actions (Cancel, Back).
- `secondary`: Subtle actions (Print, View).
- `destructive`: Irreversible actions (Delete Payment).

### Tables (`ResourceTableClient`)
The standard for all data lists. Features:
- Built-in search and pagination.
- Automatic cell formatting for dates and currency.
- Support for `onView` and `onDelete` callbacks.

### Modals & Drawers
- Use `framer-motion` for smooth entry animations.
- Always include a backdrop blur (`backdrop-blur-sm`).

---

## 3. Best Practices

### Financial Formatting
- Always show both Original Currency and Base Currency (₹) for transparent tracking.
- Use `JetBrains Mono` for numbers to ensure tabular alignment.

### Error Handling
- Use `authErrorResponse` on the backend.
- Show descriptive error messages on the frontend, never just "500 Internal Server Error."

### Interaction Design
- **Hover Effects**: All interactive elements should have subtle scaling or opacity changes.
- **Loading States**: Use `Skeleton` loaders that match the layout of the final content.
