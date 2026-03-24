import { readFileSync } from "node:fs";
import MDBReader from "mdb-reader";
import type { MicroinvestBackend, Row } from "./base.js";

interface CacheEntry {
    loadedAt: number;
    rows: Row[];
}

export class MDBBackend implements MicroinvestBackend {
    private readonly mdbPath: string;
    private readonly ttlMs: number;
    private reader: MDBReader;
    private readerLoadedAt = 0;
    private readonly tableCache = new Map<string, CacheEntry>();

    constructor(mdbPath: string, cacheTtlSeconds = 60) {
        this.mdbPath = mdbPath;
        this.ttlMs = Math.max(1, cacheTtlSeconds) * 1000;
        this.reader = this.loadReader();
    }

    private loadReader(): MDBReader {
        try {
            const buffer = readFileSync(this.mdbPath);
            this.readerLoadedAt = Date.now();
            return new MDBReader(buffer);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "EBUSY") {
                throw new Error(
                    "Database file is locked by Microinvest. Try pointing to a copy of the file.",
                );
            }
            throw error;
        }
    }

    private ensureReaderFresh(): void {
        const expired = Date.now() - this.readerLoadedAt > this.ttlMs;
        if (!expired) {
            return;
        }

        this.reader = this.loadReader();
        this.tableCache.clear();
    }

    async getTable(tableName: string): Promise<Row[]> {
        this.ensureReaderFresh();

        const cached = this.tableCache.get(tableName);
        if (cached && Date.now() - cached.loadedAt <= this.ttlMs) {
            return cached.rows;
        }

        const rows = this.reader.getTable(tableName).getData() as Row[];
        this.tableCache.set(tableName, {
            loadedAt: Date.now(),
            rows,
        });

        return rows;
    }

    async getTables(): Promise<string[]> {
        this.ensureReaderFresh();
        return this.reader.getTableNames();
    }

    async close(): Promise<void> {
        this.tableCache.clear();
    }
}
