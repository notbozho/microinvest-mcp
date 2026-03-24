import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MicroinvestBackend, Row } from "../backends/base.js";
import { getField, isDeleted, jsonResult, toNumber } from "./helpers.js";

function buildGoodsGroupMap(groups: Row[]): Map<number, Row> {
    return new Map(
        groups.map((group) => [toNumber(getField(group, "ID")), group]),
    );
}

export function registerGoodsTools(
    server: McpServer,
    backend: MicroinvestBackend,
): void {
    server.tool(
        "search_goods",
        "Search products by name, code, barcode, optional group, and optional includeDeleted toggle.",
        {
            query: z.string().min(1),
            groupId: z.number().int().optional(),
            includeDeleted: z.boolean().optional(),
        },
        async ({ query, groupId, includeDeleted = false }) => {
            const [goods, groups] = await Promise.all([
                backend.getTable("goods"),
                backend.getTable("goodsgroups"),
            ]);
            const groupsById = buildGoodsGroupMap(groups);
            const needle = query.trim().toLowerCase();

            const rows = goods
                .filter((row) => includeDeleted || !isDeleted(row))
                .filter((row) =>
                    groupId === undefined
                        ? true
                        : toNumber(getField(row, "GroupID")) === groupId,
                )
                .filter((row) => {
                    const name = String(
                        getField(row, "Name") ?? "",
                    ).toLowerCase();
                    const code = String(
                        getField(row, "Code") ?? "",
                    ).toLowerCase();
                    const barcode1 = String(
                        getField(row, "BarCode1") ?? "",
                    ).toLowerCase();
                    const barcode2 = String(
                        getField(row, "BarCode2") ?? "",
                    ).toLowerCase();
                    return (
                        name.includes(needle) ||
                        code.includes(needle) ||
                        barcode1.includes(needle) ||
                        barcode2.includes(needle)
                    );
                })
                .map((row) => {
                    const currentGroup = groupsById.get(
                        toNumber(getField(row, "GroupID")),
                    );
                    return {
                        ...row,
                        groupName: getField(currentGroup ?? {}, "Name") ?? null,
                    };
                });

            return jsonResult(rows);
        },
    );

    server.tool(
        "get_good",
        "Get a single product with full details and per-object stock.",
        {
            id: z.number().int(),
        },
        async ({ id }) => {
            const [goods, groups, storeRows, objects] = await Promise.all([
                backend.getTable("Goods"),
                backend.getTable("GoodsGroups"),
                backend.getTable("Store"),
                backend.getTable("Objects"),
            ]);

            const product = goods.find(
                (row) => toNumber(getField(row, "ID")) === id,
            );
            if (!product) {
                throw new Error(`Good not found: ${id}`);
            }

            const group = groups.find(
                (row) =>
                    toNumber(getField(row, "ID")) ===
                    toNumber(getField(product, "GroupID")),
            );
            const stocks = storeRows
                .filter((row) => toNumber(getField(row, "GoodID")) === id)
                .map((row) => {
                    const objectId = toNumber(getField(row, "ObjectID"));
                    const object = objects.find(
                        (obj) => toNumber(getField(obj, "ID")) === objectId,
                    );
                    return {
                        objectId,
                        objectName: getField(object ?? {}, "Name") ?? null,
                        qtty: toNumber(getField(row, "Qtty")),
                        price: toNumber(getField(row, "Price")),
                    };
                });

            return jsonResult({
                ...product,
                groupName: getField(group ?? {}, "Name") ?? null,
                stockByObject: stocks,
            });
        },
    );
}
