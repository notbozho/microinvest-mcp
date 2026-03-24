import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type BackendType = "mdb" | "mssql" | "mysql" | "oracle" | "sqlite";

export interface AppConfig {
    backend: BackendType;
    mdb: {
        path: string;
        cacheTtlSeconds: number;
    };
    mssql: {
        server: string;
        database: string;
        user: string;
        password: string;
        port?: number;
    };
    mysql: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    };
    oracle: {
        user: string;
        password: string;
        connectString: string;
    };
    sqlite: {
        path: string;
    };
}

interface PartialConfig {
    backend?: BackendType;
    mdb?: Partial<AppConfig["mdb"]>;
    mssql?: Partial<AppConfig["mssql"]>;
    mysql?: Partial<AppConfig["mysql"]>;
    oracle?: Partial<AppConfig["oracle"]>;
    sqlite?: Partial<AppConfig["sqlite"]>;
}

const DEFAULT_CONFIG: AppConfig = {
    backend: "mdb",
    mdb: {
        path: "C:\\ProgramData\\Microinvest\\Warehouse Pro\\baza.mdb",
        cacheTtlSeconds: 60,
    },
    mssql: {
        server: "localhost",
        database: "microinvest",
        user: "sa",
        password: "",
        port: 1433,
    },
    mysql: {
        host: "localhost",
        port: 3306,
        database: "microinvest",
        user: "root",
        password: "",
    },
    oracle: {
        user: "system",
        password: "",
        connectString: "localhost:1521/XEPDB1",
    },
    sqlite: {
        path: "/var/lib/warehouseopen/baza.db",
    },
};

function toNumber(value: string | undefined): number | undefined {
    if (!value) {
        return undefined;
    }

    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
}

function readConfigFile(): PartialConfig {
    const configPath = path.join(homedir(), ".microinvest-mcp", "config.json");
    if (!existsSync(configPath)) {
        return {};
    }

    const raw = readFileSync(configPath, "utf8");
    return JSON.parse(raw) as PartialConfig;
}

export function loadConfig(): AppConfig {
    const fileConfig = readConfigFile();

    const backend =
        (process.env.MICROINVEST_BACKEND as BackendType | undefined) ??
        fileConfig.backend ??
        DEFAULT_CONFIG.backend;

    const config: AppConfig = {
        backend,
        mdb: {
            path:
                process.env.MICROINVEST_MDB_PATH ??
                fileConfig.mdb?.path ??
                DEFAULT_CONFIG.mdb.path,
            cacheTtlSeconds:
                toNumber(process.env.MICROINVEST_MDB_CACHE_TTL_SECONDS) ??
                fileConfig.mdb?.cacheTtlSeconds ??
                DEFAULT_CONFIG.mdb.cacheTtlSeconds,
        },
        mssql: {
            server:
                process.env.MICROINVEST_MSSQL_SERVER ??
                fileConfig.mssql?.server ??
                DEFAULT_CONFIG.mssql.server,
            database:
                process.env.MICROINVEST_MSSQL_DATABASE ??
                fileConfig.mssql?.database ??
                DEFAULT_CONFIG.mssql.database,
            user:
                process.env.MICROINVEST_MSSQL_USER ??
                fileConfig.mssql?.user ??
                DEFAULT_CONFIG.mssql.user,
            password:
                process.env.MICROINVEST_MSSQL_PASSWORD ??
                fileConfig.mssql?.password ??
                DEFAULT_CONFIG.mssql.password,
            port:
                toNumber(process.env.MICROINVEST_MSSQL_PORT) ??
                fileConfig.mssql?.port ??
                DEFAULT_CONFIG.mssql.port,
        },
        mysql: {
            host:
                process.env.MICROINVEST_MYSQL_HOST ??
                fileConfig.mysql?.host ??
                DEFAULT_CONFIG.mysql.host,
            port:
                toNumber(process.env.MICROINVEST_MYSQL_PORT) ??
                fileConfig.mysql?.port ??
                DEFAULT_CONFIG.mysql.port,
            database:
                process.env.MICROINVEST_MYSQL_DATABASE ??
                fileConfig.mysql?.database ??
                DEFAULT_CONFIG.mysql.database,
            user:
                process.env.MICROINVEST_MYSQL_USER ??
                fileConfig.mysql?.user ??
                DEFAULT_CONFIG.mysql.user,
            password:
                process.env.MICROINVEST_MYSQL_PASSWORD ??
                fileConfig.mysql?.password ??
                DEFAULT_CONFIG.mysql.password,
        },
        oracle: {
            user:
                process.env.MICROINVEST_ORACLE_USER ??
                fileConfig.oracle?.user ??
                DEFAULT_CONFIG.oracle.user,
            password:
                process.env.MICROINVEST_ORACLE_PASSWORD ??
                fileConfig.oracle?.password ??
                DEFAULT_CONFIG.oracle.password,
            connectString:
                process.env.MICROINVEST_ORACLE_CONNECT_STRING ??
                fileConfig.oracle?.connectString ??
                DEFAULT_CONFIG.oracle.connectString,
        },
        sqlite: {
            path:
                process.env.MICROINVEST_SQLITE_PATH ??
                fileConfig.sqlite?.path ??
                DEFAULT_CONFIG.sqlite.path,
        },
    };

    if (config.backend === "mdb" && !config.mdb.path) {
        throw new Error(
            "MDB backend selected but no database path is configured. Set MICROINVEST_MDB_PATH or ~/.microinvest-mcp/config.json.",
        );
    }
    
    if (config.backend === "sqlite" && !config.sqlite.path) {
        throw new Error(
            "SQLite backend selected but no database path is configured. Set MICROINVEST_SQLITE_PATH or ~/.microinvest-mcp/config.json.",
        );
    }

    return config;
}
