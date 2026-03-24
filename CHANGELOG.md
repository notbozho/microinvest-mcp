# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2025-03-24

### Added

- Initial release of the Microinvest MCP server
- **MS Access (MDB)** backend with in-memory table cache and TTL auto-refresh
- **MS SQL Server / MSDE** backend with connection pooling via `mssql`
- **MySQL / MariaDB** backend with async pooling via `mysql2`
- **Oracle** backend via `oracledb` with connection pooling
- **SQLite** backend via `sqlite` / `sqlite3` for Warehouse Open deployments
- MCP tools for goods, inventory, operations, partners, reports, and admin data
- Zod validation on all tool input schemas
- Configuration via JSON config file (`~/.microinvest-mcp/config.json`) or environment variables
- Claude Desktop integration examples in README
