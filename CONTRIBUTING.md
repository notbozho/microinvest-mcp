# Contributing to microinvest-mcp

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/microinvest-mcp.git
   cd microinvest-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── backends/         # Database driver implementations
│   ├── base.ts       # MicroinvestBackend interface
│   ├── index.ts      # Backend factory
│   ├── mdb.ts        # MS Access (Jet4) backend
│   ├── mssql.ts      # MS SQL Server / MSDE backend
│   ├── mysql.ts      # MySQL / MariaDB backend
│   ├── oracle.ts     # Oracle backend
│   └── sqlite.ts     # SQLite backend
├── tools/            # MCP tool registrations
│   ├── config.ts     # Admin tools
│   ├── goods.ts      # Goods and search tools
│   ├── helpers.ts    # Shared tool utilities
│   ├── inventory.ts  # Stock and inventory tools
│   ├── operations.ts # Operations and transactions
│   ├── partners.ts   # Partner management tools
│   └── reports.ts    # Reporting tools
├── config.ts         # Configuration loader
├── constants.ts      # Shared enum/constant maps
└── index.ts          # Server entrypoint
```

## Code Style

- TypeScript strict mode is enabled
- Formatting is handled by [Prettier](https://prettier.io/) — run `npm run format` before committing
- Linting is handled by the TypeScript compiler (`npm run lint`)

## Adding a New Backend

1. Create a new file in `src/backends/` implementing the `MicroinvestBackend` interface from `base.ts`
2. Add the backend type to `BackendType` in `src/config.ts`
3. Add default config values and environment variable mappings in `src/config.ts`
4. Register the backend in the factory function in `src/backends/index.ts`

## Adding a New Tool

1. Create or extend a file in `src/tools/`
2. Use `server.tool()` from the MCP SDK with a Zod schema for input validation
3. Register the tool group in `src/index.ts`

## Pull Requests

- Keep PRs focused on a single change
- Ensure `npm run build` passes with no errors
- Update `README.md` if adding new tools or backends
