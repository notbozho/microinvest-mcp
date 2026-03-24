🌐 [English](./README.md)

# Microinvest-MCP

MCP сървър за Microinvest Warehouse Pro, Microinvest Warehouse Mobile и Microinvest Warehouse Open.

Този проект предоставя данни от Microinvest на AI агенти чрез Model Context Protocol. Поддържа нативни връзки към всички бази данни, използвани в екосистемата на Microinvest за Windows и Linux.

## Функционалности

- Node.js MCP сървър, написан на TypeScript
- Универсална поддръжка на бази данни от Microinvest екосистемата:
  - **MS Access (MDB)** чрез `mdb-reader` с кеширани таблици и TTL
  - **MS SQL Server / MSDE** чрез `mssql` с пул от параметризирани заявки
  - **MySQL / MariaDB** чрез `mysql2` с асинхронен пул
  - **SQLite** чрез `sqlite` (използва се основно в Microinvest Warehouse Open за Linux)
  - **Oracle** чрез `oracledb` Node API
- Инструменти за стоки, наличност, операции, партньори, справки и администрация
- Zod валидация на всяка входна схема

## Инсталация

```bash
npm install
npm run build
```

За разработка:

```bash
npm run dev
```

За продукция:

```bash
node dist/index.js
```

Или чрез npm binary входна точка:

```bash
npx microinvest-mcp
```

## Конфигурация

Сървърът очаква конфигурационен файл за определяне на връзката. Създайте файл на:

- Windows: `%USERPROFILE%/.microinvest-mcp/config.json`
- Linux/macOS: `~/.microinvest-mcp/config.json`

Примерна конфигурация с подразбиращи се стойности:

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

Променливите на средата имат приоритет над стойностите от конфигурационния файл:

- `MICROINVEST_BACKEND` (Възможни стойности: "mdb", "mssql", "mysql", "oracle", "sqlite")
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

## Настройка за Claude Desktop MCP

Добавете следния конфигурационен блок към настройките на Claude Desktop MCP:

### Директна локална MDB връзка (по подразбиране)
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

### Отдалечена MySQL / MS SQL връзка
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

## Налични инструменти

### Стоки и наличност

- `search_goods` — търсене на стоки
- `get_good` — детайли за стока
- `get_stock` — текуща наличност
- `get_goods_groups` — групи стоки
- `get_low_stock` — стоки с ниска наличност

### Операции и транзакции

- `get_operations` — списък операции
- `get_operation_detail` — детайли за операция
- `get_sales_summary` — обобщение на продажбите
- `get_last_purchase_price` — последна доставна цена

### Партньори

- `search_partners` — търсене на партньори
- `get_partner` — детайли за партньор
- `get_partner_balance` — баланс на партньор

### Справки

- `get_turnover` — оборот
- `get_top_goods` — най-продавани стоки
- `get_cash_book` — касова книга

### Администрация

- `list_objects` — списък обекти
- `list_users` — списък потребители
- `get_configuration` — конфигурация на системата

## Справка за OperType

| OperType | Значение                     |
| -------- | ---------------------------- |
| 1        | Покупка/Доставка             |
| 2        | Продажба                     |
| 3        | Връщане от клиент            |
| 4        | Ревизия                      |
| 5        | Бракуване/Отпадъци           |
| 6        | Трансфер между обекти        |
| 7        | Производство                 |
| 8        | Сложно производство          |
| 9        | Даване на консигнация        |
| 10       | Връщане на консигнация       |
| 11       | Проформа фактура             |
| 12       | Поръчка                      |
| 13       | Оферта                       |
| 14       | Фактура                      |
| 15       | Дебитно известие             |
| 16       | Кредитно известие            |
| 17       | Авансово плащане             |
| 18       | Касова книга запис           |
| 19       | Получена фактура             |
| 20       | Заявка                       |

## Бележки за бекенд режимите

- MDB бекендът използва Jet4 парсер вътрешно. При `EBUSY` грешка (файлът е заключен от Microinvest) се хвърля ясно съобщение — опитайте с копие на файла.
- Всички драйвери превеждат `.getTable()` заявките в речникови записи, съвместими със Zod валидацията на инструментите.
