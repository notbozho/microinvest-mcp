import mssql from "mssql";
import type { MicroinvestBackend, Row } from "./base.js";

export interface MSSQLConfig {
    server: string;
    database: string;
    user: string;
    password: string;
    port?: number;
}

export class MSSQLBackend implements MicroinvestBackend {
    private pool: mssql.ConnectionPool;
    private dbConnectPromise: Promise<mssql.ConnectionPool> | null = null;

    constructor(private readonly _config: MSSQLConfig) {
        this.pool = new mssql.ConnectionPool({
            user: _config.user,
            password: _config.password,
            database: _config.database,
            server: _config.server,
            port: _config.port ?? 1433,
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
        });
    }

    private async connectIfNeeded(): Promise<void> {
        if (!this.pool.connected) {
            if (!this.dbConnectPromise) {
                this.dbConnectPromise = this.pool.connect();
            }
            await this.dbConnectPromise;
        }
    }

    async getTable(tableName: string): Promise<Row[]> {
        await this.connectIfNeeded();
        const result = await this.pool.request().query(`SELECT * FROM [${tableName}]`);
        return result.recordset as Row[];
    }

    async getTables(): Promise<string[]> {
        await this.connectIfNeeded();
        const result = await this.pool.request().query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'",
        );
        return result.recordset.map((row) => row.TABLE_NAME as string);
    }

    async query(sql: string, params: unknown[] = []): Promise<Row[]> {
        await this.connectIfNeeded();
        // Fallback for simple raw queries without parameters
        if (params.length > 0) {
            throw new Error("MSSQL positional bindings array not supported in generic query method.");
        }
        const result = await this.pool.request().query(sql);
        return result.recordset as Row[];
    }

    async close(): Promise<void> {
        if (this.pool.connected) {
            await this.pool.close();
        }
    }
}
