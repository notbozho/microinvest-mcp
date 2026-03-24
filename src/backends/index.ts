import type { MicroinvestBackend } from "./base.js";
import { MDBBackend } from "./mdb.js";
import { MSSQLBackend } from "./mssql.js";
import { MySQLBackend } from "./mysql.js";
import { OracleBackend } from "./oracle.js";
import { SQLiteBackend } from "./sqlite.js";
import type { AppConfig } from "../config.js";

export async function createBackend(
    config: AppConfig,
): Promise<MicroinvestBackend> {
    if (config.backend === "mdb") {
        return new MDBBackend(config.mdb.path, config.mdb.cacheTtlSeconds);
    }

    if (config.backend === "mssql") {
        return new MSSQLBackend(config.mssql);
    }

    if (config.backend === "mysql") {
        return new MySQLBackend(config.mysql);
    }

    if (config.backend === "oracle") {
        return new OracleBackend(config.oracle);
    }

    if (config.backend === "sqlite") {
        return new SQLiteBackend(config.sqlite);
    }

    throw new Error(`Unsupported backend: ${String(config.backend)}`);
}
