import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MicroinvestBackend } from "../backends/base.js";
import { getField, isDeleted, jsonResult, toNumber } from "./helpers.js";

export function registerInventoryTools(
    server: McpServer,
    backend: MicroinvestBackend,
): void {
    server.tool(
        "get_stock",
        "Get current stock levels from the store table, filtered by goodId and/or objectId.",
        {
            goodId: z.number().int().optional(),
            objectId: z.number().int().optional(),
        },
        async ({ goodId, objectId }) => {
            const [storeRows, goods, objects] = await Promise.all([
                backend.getTable("store"),
                backend.getTable("goods"),
                backend.getTable("objects"),
            ]);

            const rows = storeRows
                .filter((row) =>
                    goodId === undefined
                        ? true
                        : toNumber(getField(row, "GoodID")) === goodId,
                )
                .filter((row) =>
                    objectId === undefined
                        ? true
                        : toNumber(getField(row, "ObjectID")) === objectId,
                )
                .map((row) => {
                    const currentGood = goods.find(
                        (good) =>
                            toNumber(getField(good, "ID")) ===
                            toNumber(getField(row, "GoodID")),
                    );
                    const currentObject = objects.find(
                        (obj) =>
                            toNumber(getField(obj, "ID")) ===
                            toNumber(getField(row, "ObjectID")),
                    );

                    return {
                        goodId: toNumber(getField(row, "GoodID")),
                        goodCode: getField(currentGood ?? {}, "Code") ?? null,
                        goodName: getField(currentGood ?? {}, "Name") ?? null,
                        objectId: toNumber(getField(row, "ObjectID")),
                        objectName:
                            getField(currentObject ?? {}, "Name") ?? null,
                        qtty: toNumber(getField(row, "Qtty")),
                        price: toNumber(getField(row, "Price")),
                    };
                });

            return jsonResult(rows);
        },
    );

    server.tool(
        "get_goods_groups",
        "List all product categories/groups.",
        {},
        async () => {
            const groups = await backend.getTable("goodsgroups");
            const rows = groups.sort((a, b) =>
                String(getField(a, "Name") ?? "").localeCompare(
                    String(getField(b, "Name") ?? ""),
                ),
            );
            return jsonResult(rows);
        },
    );

    server.tool(
        "get_low_stock",
        "List products with current stock at or below threshold, using live store table quantities.",
        {
            threshold: z.number().optional(),
        },
        async ({ threshold = 0 }) => {
            const [goods, storeRows] = await Promise.all([
                backend.getTable("goods"),
                backend.getTable("store"),
            ]);
            const totalByGood = new Map<number, number>();

            for (const row of storeRows) {
                const id = toNumber(getField(row, "GoodID"));
                const current = totalByGood.get(id) ?? 0;
                totalByGood.set(id, current + toNumber(getField(row, "Qtty")));
            }

            const rows = goods
                .filter((row) => !isDeleted(row))
                .map((row) => {
                    const id = toNumber(getField(row, "ID"));
                    return {
                        id,
                        code: getField(row, "Code") ?? null,
                        name: getField(row, "Name") ?? null,
                        groupId: toNumber(getField(row, "GroupID")),
                        qtty: totalByGood.get(id) ?? 0,
                        threshold,
                    };
                })
                .filter((row) => row.qtty <= threshold)
                .sort((a, b) => a.qtty - b.qtty);

            return jsonResult(rows);
        },
    );
}
