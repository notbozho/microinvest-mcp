import oracledb from "oracledb";
import type { MicroinvestBackend, Row } from "./base.js";

export interface OracleConfig {
    user: string;
    password: string;
    connectString: string; // e.g. "localhost:1521/XEPDB1"
}

export class OracleBackend implements MicroinvestBackend {
    private poolPromise: Promise<oracledb.Pool> | null = null;
    private pool: oracledb.Pool | null = null;

    constructor(private readonly _config: OracleConfig) {
        oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
        
        this.poolPromise = oracledb.createPool({
            user: _config.user,
            password: _config.password,
            connectString: _config.connectString,
            poolMin: 1,
            poolMax: 10,
            poolIncrement: 1,
        }).then((p: oracledb.Pool) => {
            this.pool = p;
            return p;
        });
    }

    private async getConnection(): Promise<oracledb.Connection> {
        if (!this.pool) {
            await this.poolPromise;
        }
        if (!this.pool) throw new Error("Oracle pool initialization failed.");
        return await this.pool.getConnection();
    }

    async getTable(tableName: string): Promise<Row[]> {
        const connection = await this.getConnection();
        try {
            const result = await connection.execute(`SELECT * FROM "${tableName}"`);
            return (result.rows || []) as Row[];
        } finally {
            await connection.close();
        }
    }

    async getTables(): Promise<string[]> {
        const connection = await this.getConnection();
        try {
            const result = await connection.execute(
                "SELECT TABLE_NAME FROM USER_TABLES"
            );
            return (result.rows || []).map((row: any) => row.TABLE_NAME as string);
        } finally {
            await connection.close();
        }
    }

    async query(sql: string, params: unknown[] = []): Promise<Row[]> {
        const connection = await this.getConnection();
        try {
            const result = await connection.execute(sql, params as any[]);
            return (result.rows || []) as Row[];
        } finally {
            await connection.close();
        }
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.close(10);
        }
    }
}
