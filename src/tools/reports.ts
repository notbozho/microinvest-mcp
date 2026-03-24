import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MicroinvestBackend } from "../backends/base.js";
import { getOperTypeName } from "../constants.js";
import {
    getField,
    inDateRange,
    jsonResult,
    parseInputDate,
    toNumber,
} from "./helpers.js";

function salesAmount(row: Record<string, unknown>): number {
    const qtty = toNumber(getField(row, "Qtty"));
    const priceOut = toNumber(getField(row, "PriceOut"));
    return qtty * priceOut;
}

export function registerReportsTools(
    server: McpServer,
    backend: MicroinvestBackend,
): void {
    server.tool(
        "get_turnover",
        "Get total revenue for sales/invoice operations in a date range with optional object filter.",
        {
            dateFrom: z.string(),
            dateTo: z.string(),
            objectId: z.number().int().optional(),
        },
        async ({ dateFrom, dateTo, objectId }) => {
            const from = parseInputDate(dateFrom, false);
            const to = parseInputDate(dateTo, true);
            const operations = await backend.getTable("operations");

            const turnoverOps = operations
                .filter((row) =>
                    [2, 14].includes(toNumber(getField(row, "OperType"))),
                )
                .filter((row) => inDateRange(getField(row, "Date"), from, to))
                .filter((row) =>
                    objectId === undefined
                        ? true
                        : toNumber(getField(row, "ObjectID")) === objectId,
                );

            const turnover = turnoverOps.reduce(
                (sum, row) => sum + salesAmount(row),
                0,
            );

            return jsonResult({
                dateFrom,
                dateTo,
                objectId: objectId ?? null,
                operationCount: turnoverOps.length,
                turnover,
            });
        },
    );

    server.tool(
        "get_top_goods",
        "Get top selling goods by quantity and revenue for a date range.",
        {
            dateFrom: z.string(),
            dateTo: z.string(),
            limit: z.number().int().positive().max(1000).optional(),
        },
        async ({ dateFrom, dateTo, limit = 10 }) => {
            const from = parseInputDate(dateFrom, false);
            const to = parseInputDate(dateTo, true);
            const [operations, goods] = await Promise.all([
                backend.getTable("operations"),
                backend.getTable("goods"),
            ]);

            const sales = operations
                .filter((row) => toNumber(getField(row, "OperType")) === 2)
                .filter((row) => inDateRange(getField(row, "Date"), from, to));

            const agg = new Map<
                number,
                { goodId: number; qtty: number; revenue: number }
            >();
            for (const row of sales) {
                const goodId = toNumber(getField(row, "GoodID"));
                const current = agg.get(goodId) ?? {
                    goodId,
                    qtty: 0,
                    revenue: 0,
                };
                current.qtty += toNumber(getField(row, "Qtty"));
                current.revenue += salesAmount(row);
                agg.set(goodId, current);
            }

            const rows = Array.from(agg.values())
                .map((item) => {
                    const good = goods.find(
                        (row) => toNumber(getField(row, "ID")) === item.goodId,
                    );
                    return {
                        ...item,
                        goodCode: getField(good ?? {}, "Code") ?? null,
                        goodName: getField(good ?? {}, "Name") ?? null,
                    };
                })
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, limit);

            return jsonResult(rows);
        },
    );

    server.tool(
        "get_cash_book",
        "Get cashbook entries between dates with OperType label enrichment.",
        {
            dateFrom: z.string(),
            dateTo: z.string(),
        },
        async ({ dateFrom, dateTo }) => {
            const from = parseInputDate(dateFrom, false);
            const to = parseInputDate(dateTo, true);
            const cashBook = await backend.getTable("cashbook");

            const rows = cashBook
                .filter((row) => inDateRange(getField(row, "Date"), from, to))
                .map((row) => ({
                    ...row,
                    operTypeName: getOperTypeName(
                        toNumber(getField(row, "OperType"), -1),
                    ),
                }))
                .sort(
                    (a, b) =>
                        toNumber(getField(b, "ID")) -
                        toNumber(getField(a, "ID")),
                );

            return jsonResult(rows);
        },
    );
}
