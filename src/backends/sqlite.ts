import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import type { MicroinvestBackend, Row } from "./base.js";

export interface SQLiteConfig {
    path: string;
}

export class SQLiteBackend implements MicroinvestBackend {
    private dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>>;

    constructor(private readonly _config: SQLiteConfig) {
        this.dbPromise = open({
            filename: _config.path,
            driver: sqlite3.Database,
        });
    }

    async getTable(tableName: string): Promise<Row[]> {
        const db = await this.dbPromise;
        const rows = await db.all(`SELECT * FROM "${tableName}"`);
        return rows as Row[];
    }

    async getTables(): Promise<string[]> {
        const db = await this.dbPromise;
        const rows = await db.all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        );
        return rows.map((row: any) => row.name as string);
    }

    async query(sql: string, params: unknown[] = []): Promise<Row[]> {
        const db = await this.dbPromise;
        const rows = await db.all(sql, params);
        return rows as Row[];
    }

    async close(): Promise<void> {
        const db = await this.dbPromise;
        await db.close();
    }
}
