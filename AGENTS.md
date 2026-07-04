# Agent Instructions

## Server Project

This project uses TypeScript, ESLint, Prettier, SQLFluff, Jest, and Prisma.
Treat `package.json`, `eslint.config.ts`, `.prettierrc`, `.sqlfluff`, and
`.vscode/settings.json` as the source of truth for linting and formatting.

When changing server files:

- Work from this `server/` directory for server commands, matching the VS Code
  ESLint working directory.
- Format changed TypeScript, JavaScript, JSON, and other Prettier-supported
  files with Prettier. The project Prettier config currently sets
  `singleQuote: true`.
- Format Markdown description text, including commit message bodies, with
  Prettier before using it.
- When adding a file-level header comment, leave one empty line after it before
  imports or code.
- Format changed SQL migration files with SQLFluff: `npm run format:sql`. This
  uses `sqlfluff fix prisma/migrations`.
- Run ESLint after TypeScript changes: `npm run lint`.
- Run SQLFluff after SQL migration changes: `npm run lint:sql`. This uses
  `sqlfluff lint prisma/migrations`.
- If an ESLint fix is appropriate, use the project ESLint config with
  `npm exec eslint -- --fix <changed-files>`, then re-run `npm run lint`.
- For changes that can affect runtime behavior, run the focused Jest test or
  `npm test` when practical.
- For changes that can affect emitted TypeScript or Prisma generated code, run
  `npm run build` when practical.

This emulates the Codium/VS Code setup:

- `editor.formatOnSave` is enabled.
- TypeScript, JavaScript, and JSON use the Prettier formatter.
- SQL uses the SQLFluff formatter with `.sqlfluff` as the shared CLI and editor
  config.
- SQLFluff editor diagnostics are disabled; rely on format-on-save in Codium
  and `npm run lint:sql` in the CLI.
- ESLint validates TypeScript from this project directory.
- Save-time fix-all is configured through `editor.codeActionsOnSave`, so mimic
  it by running ESLint fixes explicitly when changing linted code.

## Database Structure

- Treat `prisma/migrations/*.sql` as the source of truth for database
  structure.
- Never use SQL `ENUM` columns. For finite state values, create a lookup table
  with `id` and `name` fields, then reference it from the target table with a
  foreign-key id field.
- For enum-like lookup tables with predefined rows inserted during database
  creation, use `INTEGER` for the `id` field. Values in those rows may change in
  some cases, but the row count is constant.
- For app-filled tables, use only `VARCHAR(191)` for the `id` field. This field
  contains an LUUID value, giving a native way to sort quickly and avoid
  conflicts across multiple clients.
- Keep `prisma/schema.prisma` based on the SQL migration files, not the other
  way around.
- Client-side data structures must mirror the database structure defined by the
  SQL migrations.
- The client can work without a server connection and synchronize later, so API
  contracts must let the client define all app-created record fields needed for
  offline creation.

## JSON-RPC Contract

- JSON-RPC `params` and successful `result` values must always be objects. Use
  an empty object when no fields are needed.
- Never use an array, string, number, boolean, or `null` as the top-level
  `params` or successful `result` value. Arrays are allowed only inside an
  object field.

## Equality Style

- Prefer `==` and `!=` instead of `===` and `!==` when the compared values have
  controlled or obvious types.
- Keep `===` or `!==` only when strict equality is needed to avoid an unwanted
  coercion or to preserve existing behavior.
