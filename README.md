🌐 [Български](./README.bg.md)

# Microinvest-MCP

MCP server for Microinvest Warehouse Pro, Microinvest Warehouse Mobile, and Microinvest Warehouse Open.

This project exposes Microinvest data to AI agents through Model Context Protocol tools. It supports entirely native and robust connections to all supported databases utilized across the Microinvest ecosystem on Windows and Linux nodes.

## Features

- Node.js MCP server written in TypeScript
- Universal support across Microinvest ecosystem databases:
  - **MS Access (MDB)** via `mdb-reader` with cached table lookups and cache-TTL
  - **MS SQL Server / MSDE** via `mssql` parameterized query pools
  - **MySQL / MariaDB** via `mysql2` async pool implementations
  - **SQLite** via fast `sqlite` (Commonly deployed on Linux Microinvest Warehouse Open)
  - **Oracle** via `oracledb` node API
- Tools for goods, stock, operations, partners, reports, and admin data
- Zod validation on every tool input schema ensuring strict API parameters

## Install

```bash
npm install
npm run build
```

For development:

```bash
npm run dev
```

For production run:

```bash
node dist/index.js
```

Or from npm binary entrypoint after install:

```bash
npx microinvest-mcp
```

## Configuration

The server expects configuration logic to determine connections. Create a config file at:

- Windows: `%USERPROFILE%/.microinvest-mcp/config.json`
- Linux/macOS: `~/.microinvest-mcp/config.json`

Example config schema with default values available for selection:

```json
{
    "backend": "mdb",
    "mdb": {
        "path": "C:\\ProgramData\\Microinvest\\Warehouse Pro\\baza.mdb",
        "cacheTtlSeconds": 60
    },
    "mssql": {
        "server": "localhost",
        "database": "microinvest",
        "user": "sa",
        "password": "",
        "port": 1433
    },
    "mysql": {
        "host": "localhost",
        "port": 3306,
        "database": "microinvest",
        "user": "root",
        "password": ""
    },
    "sqlite": {
        "path": "/var/lib/warehouseopen/baza.db"
    },
    "oracle": {
        "user": "system",
        "password": "",
        "connectString": "localhost:1521/XEPDB1"
    }
}
```

Environment variables strictly override config file values and provide easier setup flows for process execution:

- `MICROINVEST_BACKEND` (Enum choices: "mdb", "mssql", "mysql", "oracle", "sqlite")
- `MICROINVEST_MDB_PATH`
- `MICROINVEST_MDB_CACHE_TTL_SECONDS`
- `MICROINVEST_MSSQL_SERVER`
- `MICROINVEST_MSSQL_DATABASE`
- `MICROINVEST_MSSQL_USER`
- `MICROINVEST_MSSQL_PASSWORD`
- `MICROINVEST_MSSQL_PORT`
- `MICROINVEST_MYSQL_HOST`
- `MICROINVEST_MYSQL_PORT`
- `MICROINVEST_MYSQL_DATABASE`
- `MICROINVEST_MYSQL_USER`
- `MICROINVEST_MYSQL_PASSWORD`
- `MICROINVEST_SQLITE_PATH`
- `MICROINVEST_ORACLE_USER`
- `MICROINVEST_ORACLE_PASSWORD`
- `MICROINVEST_ORACLE_CONNECT_STRING`

## Claude Desktop MCP Setup

Add the following configuration snippets mapping dependent to your local host to the Claude Desktop MCP runtime configs:

### Direct Local MDB Binding (Default)
```json
{
    "mcpServers": {
        "microinvest": {
            "command": "node",
            "args": ["/absolute/path/to/microinvest-mcp/dist/index.js"],
            "env": {
                "MICROINVEST_BACKEND": "mdb",
                "MICROINVEST_MDB_PATH": "C:\\ProgramData\\Microinvest\\Warehouse Pro\\baza.mdb"
            }
        }
    }
}
```

### Remote MySQL / MS SQL Binding
```json
{
    "mcpServers": {
        "microinvest": {
            "command": "node",
            "args": ["/absolute/path/to/microinvest-mcp/dist/index.js"],
            "env": {
                "MICROINVEST_BACKEND": "mysql",
                "MICROINVEST_MYSQL_HOST": "192.168.1.55",
                "MICROINVEST_MYSQL_USER": "root",
                "MICROINVEST_MYSQL_PASSWORD": "securepassword",
                "MICROINVEST_MYSQL_DATABASE": "microinvest"
            }
        }
    }
}
```

## Implemented Tools

### Goods and Inventory

- `search_goods`
- `get_good`
- `get_stock`
- `get_goods_groups`
- `get_low_stock`

### Operations and Transactions

- `get_operations`
- `get_operation_detail`
- `get_sales_summary`
- `get_last_purchase_price`

### Partners

- `search_partners`
- `get_partner`
- `get_partner_balance`

### Reports

- `get_turnover`
- `get_top_goods`
- `get_cash_book`

### Admin

- `list_objects`
- `list_users`
- `get_configuration`

## OperType Reference

| OperType | Meaning                  |
| -------- | ------------------------ |
| 1        | Purchase/Delivery        |
| 2        | Sale                     |
| 3        | Return from client       |
| 4        | Stocktake/Revision       |
| 5        | Write-off/Waste          |
| 6        | Transfer between objects |
| 7        | Production               |
| 8        | Complex Production       |
| 9        | Consignment give         |
| 10       | Consignment return       |
| 11       | Proforma invoice         |
| 12       | Order                    |
| 13       | Offer/Quote              |
| 14       | Invoice                  |
| 15       | Debit note               |
| 16       | Credit note              |
| 17       | Advance payment          |
| 18       | Cash book entry          |
| 19       | Received invoice         |
| 20       | Request                  |

## Notes on Backend Execution Modes

- MDB backend handles Jet4 parsers internally. Locking behavior handles `EBUSY` error yields gracefully allowing concurrent safe readings.
- All drivers translate generic `.getTable()` queries safely parsing array arrays into record dictionaries mappings standard for `zod` tool validation processing.
