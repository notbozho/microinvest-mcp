import type { MicroinvestBackend, Row } from "./base.js";
import mysql from "mysql2/promise";

export interface MySQLConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export class MySQLBackend implements MicroinvestBackend {
    private pool: mysql.Pool;

    constructor(private readonly _config: MySQLConfig) {
        this.pool = mysql.createPool({
            host: _config.host,
            port: _config.port,
            database: _config.database,
            user: _config.user,
            password: _config.password,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }

    async getTable(tableName: string): Promise<Row[]> {
        // mysql2 prevents SQL injection when querying table names by using ? placeholder for identifiers ONLY if it's set as double quoted parameter, but raw strings are easier for simple single tables
        // Wait, mysql doesn't support parameterized identifiers. So we use string interpolation with basic backticks.
        // The tableName comes from getTables() usually so it's safe.
        const [rows] = await this.pool.query("SELECT * FROM ??", [tableName]);
        return rows as Row[];
    }

    async getTables(): Promise<string[]> {
        const [rows] = await this.pool.query("SHOW TABLES");
        // rows is an array of objects like { "Tables_in_database": "TableName" }
        return (rows as any[]).map((row) => Object.values(row)[0] as string);
    }

    async query(sql: string, params: unknown[] = []): Promise<Row[]> {
        const [rows] = await this.pool.execute(sql, params as any);
        return rows as Row[];
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
