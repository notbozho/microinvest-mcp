import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MicroinvestBackend } from "../backends/base.js";
import { getField, jsonResult } from "./helpers.js";

export function registerAdminTools(
    server: McpServer,
    backend: MicroinvestBackend,
): void {
    server.tool(
        "list_objects",
        "List all objects (warehouses/POS terminals).",
        {},
        async () => {
            const objects = await backend.getTable("objects");
            return jsonResult(objects);
        },
    );

    server.tool(
        "list_users",
        "List all operators/users without exposing password fields.",
        {},
        async () => {
            const users = await backend.getTable("users");
            const safeUsers = users.map((row) => {
                const clone = { ...row };
                delete clone.Password;
                delete clone.password;
                return clone;
            });

            return jsonResult(safeUsers);
        },
    );

    server.tool(
        "get_configuration",
        "Read configuration key-value entries, optionally filtered by key.",
        {
            key: z.string().optional(),
        },
        async ({ key }) => {
            const configRows = await backend.getTable("configuration");
            const rows = key
                ? configRows.filter(
                      (row) =>
                          String(getField(row, "Key") ?? "").toLowerCase() ===
                          key.toLowerCase(),
                  )
                : configRows;

            return jsonResult(rows);
        },
    );
}
