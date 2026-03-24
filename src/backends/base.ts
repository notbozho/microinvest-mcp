export type Row = Record<string, unknown>;

export interface MicroinvestBackend {
  /** Return all rows from a table */
  getTable(tableName: string): Promise<Row[]>;

  /** Return list of all table names */
  getTables(): Promise<string[]>;

  /** Execute a raw SQL query — only available on MSSQL and MySQL backends */
  query?(sql: string, params?: unknown[]): Promise<Row[]>;

  close(): Promise<void>;
}
