# Database Approach (MVP)

We will use SQLite for local persistence. The database file will be created automatically if it does not exist when the backend starts.

## Core Entities

- `users`: supports multi-user in the future. The MVP login is still hardcoded in the UI.
- `boards`: one board per user for the MVP.
- `columns`: fixed set per board, with user-editable names.
- `cards`: cards belong to a column and are ordered by `position`.

## Ordering

Both columns and cards use a simple integer `position` field for ordering inside a board/column. Reordering rewrites positions in the backend.

## Schema Source

The canonical schema proposal lives in `docs/db-schema.json`.
