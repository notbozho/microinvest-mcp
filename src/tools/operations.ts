import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MicroinvestBackend, Row } from "../backends/base.js";
import { getOperTypeName } from "../constants.js";
import {
    getField,
    inDateRange,
    jsonResult,
    parseInputDate,
    toDate,
    toNumber,
} from "./helpers.js";

function lineAmount(row: Row): number {
    const qtty = toNumber(getField(row, "Qtty"));
    const priceOut = toNumber(getField(row, "PriceOut"));
    const priceIn = toNumber(getField(row, "PriceIn"));
    const unitPrice = priceOut !== 0 ? priceOut : priceIn;
    return qtty * unitPrice;
}

export function registerOperationsTools(
    server: McpServer,
    backend: MicroinvestBackend,
): void {
    server.tool(
        "get_operations",
        "Get operations/transactions with optional filters by operType, partner, date range, and limit.",
        {
            operType: z.number().int().optional(),
            partnerId: z.number().int().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            limit: z.number().int().positive().max(5000).optional(),
        },
        async ({ operType, partnerId, dateFrom, dateTo, limit = 100 }) => {
            const from = parseInputDate(dateFrom, false);
            const to = parseInputDate(dateTo, true);
            const operations = await backend.getTable("Operations");

            const rows = operations
                .filter((row) =>
                    operType === undefined
                        ? true
                        : toNumber(getField(row, "OperType")) === operType,
                )
                .filter((row) =>
                    partnerId === undefined
                        ? true
                        : toNumber(getField(row, "PartnerID")) === partnerId,
                )
                .filter((row) => inDateRange(getField(row, "Date"), from, to))
                .map((row) => ({
                    ...row,
                    operTypeName: getOperTypeName(
                        toNumber(getField(row, "OperType"), -1),
                    ),
                }))
                .sort(
                    (a, b) =>
                        toDate(getField(b, "Date", "UserRealTime"))!.getTime() -
                        toDate(getField(a, "Date", "UserRealTime"))!.getTime(),
                )
                .slice(0, limit);

            return jsonResult(rows);
        },
    );

    server.tool(
        "get_operation_detail",
        "Get all line items for a specific document identified by Acct and OperType.",
        {
            acct: z.number().int(),
            operType: z.number().int(),
        },
        async ({ acct, operType }) => {
            const [operations, goods, partners, objects, users] =
                await Promise.all([
                    backend.getTable("operations"),
                    backend.getTable("goods"),
                    backend.getTable("partners"),
                    backend.getTable("objects"),
                    backend.getTable("users"),
                ]);

            const lines = operations.filter(
                (row) =>
                    toNumber(getField(row, "Acct")) === acct &&
                    toNumber(getField(row, "OperType")) === operType,
            );

            if (lines.length === 0) {
                throw new Error(
                    `No operation lines found for Acct=${acct}, OperType=${operType}`,
                );
            }

            const detailLines = lines.map((line) => {
                const good = goods.find(
                    (row) =>
                        toNumber(getField(row, "ID")) ===
                        toNumber(getField(line, "GoodID")),
                );
                const partner = partners.find(
                    (row) =>
                        toNumber(getField(row, "ID")) ===
                        toNumber(getField(line, "PartnerID")),
                );
                const object = objects.find(
                    (row) =>
                        toNumber(getField(row, "ID")) ===
                        toNumber(getField(line, "ObjectID")),
                );
                const user = users.find(
                    (row) =>
                        toNumber(getField(row, "ID")) ===
                        toNumber(getField(line, "OperatorID", "UserID")),
                );

                return {
                    ...line,
                    operTypeName: getOperTypeName(operType),
                    goodName: getField(good ?? {}, "Name") ?? null,
                    goodCode: getField(good ?? {}, "Code") ?? null,
                    partnerName: getField(partner ?? {}, "Name") ?? null,
                    objectName: getField(object ?? {}, "Name") ?? null,
                    operatorName: getField(user ?? {}, "Name") ?? null,
                    lineTotal: lineAmount(line),
                };
            });

            return jsonResult({
                acct,
                operType,
                operTypeName: getOperTypeName(operType),
                lineCount: detailLines.length,
                totalAmount: detailLines.reduce(
                    (sum, line) => sum + toNumber(line.lineTotal),
                    0,
                ),
                lines: detailLines,
            });
        },
    );

    server.tool(
        "get_sales_summary",
        "Get aggregated sales summary in date range grouped by day, month, partner, or good.",
        {
            dateFrom: z.string(),
            dateTo: z.string(),
            groupBy: z.enum(["day", "month", "partner", "good"]).optional(),
        },
        async ({ dateFrom, dateTo, groupBy = "day" }) => {
            const from = parseInputDate(dateFrom, false);
            const to = parseInputDate(dateTo, true);
            const [operations, goods, partners] = await Promise.all([
                backend.getTable("operations"),
                backend.getTable("goods"),
                backend.getTable("partners"),
            ]);

            const sales = operations.filter(
                (row) =>
                    toNumber(getField(row, "OperType")) === 2 &&
                    inDateRange(getField(row, "Date"), from, to),
            );

            const groups = new Map<
                string,
                {
                    key: string;
                    quantity: number;
                    revenue: number;
                    count: number;
                }
            >();

            for (const row of sales) {
                const date = toDate(getField(row, "Date"));
                if (!date) {
                    continue;
                }

                let key = "unknown";

                if (groupBy === "day") {
                    key = date.toISOString().slice(0, 10);
                } else if (groupBy === "month") {
                    key = date.toISOString().slice(0, 7);
                } else if (groupBy === "partner") {
                    const partnerId = toNumber(getField(row, "PartnerID"));
                    const partner = partners.find(
                        (item) => toNumber(getField(item, "ID")) === partnerId,
                    );
                    key = String(
                        getField(partner ?? {}, "Name") ??
                            `Partner #${partnerId}`,
                    );
                } else {
                    const goodId = toNumber(getField(row, "GoodID"));
                    const good = goods.find(
                        (item) => toNumber(getField(item, "ID")) === goodId,
                    );
                    key = String(
                        getField(good ?? {}, "Name") ?? `Good #${goodId}`,
                    );
                }

                const existing = groups.get(key) ?? {
                    key,
                    quantity: 0,
                    revenue: 0,
                    count: 0,
                };
                existing.quantity += toNumber(getField(row, "Qtty"));
                existing.revenue += lineAmount(row);
                existing.count += 1;
                groups.set(key, existing);
            }

            const rows = Array.from(groups.values());
            if (groupBy === "day" || groupBy === "month") {
                rows.sort((a, b) => a.key.localeCompare(b.key));
            } else {
                rows.sort((a, b) => b.revenue - a.revenue);
            }

            return jsonResult(rows);
        },
    );

    server.tool(
        "get_last_purchase_price",
        "Get the latest purchase price (OperType 1) for a specific product.",
        {
            goodId: z.number().int(),
        },
        async ({ goodId }) => {
            const operations = await backend.getTable("operations");
            const purchases = operations
                .filter((row) => toNumber(getField(row, "OperType")) === 1)
                .filter((row) => toNumber(getField(row, "GoodID")) === goodId)
                .sort(
                    (a, b) =>
                        toDate(getField(b, "Date", "UserRealTime"))!.getTime() -
                        toDate(getField(a, "Date", "UserRealTime"))!.getTime(),
                );

            const latest = purchases[0];
            if (!latest) {
                return jsonResult({
                    goodId,
                    found: false,
                    message: "No purchase records found for this product.",
                });
            }

            return jsonResult({
                goodId,
                found: true,
                operType: 1,
                operTypeName: getOperTypeName(1),
                acct: toNumber(getField(latest, "Acct")),
                date: getField(latest, "Date") ?? null,
                priceIn: toNumber(getField(latest, "PriceIn")),
            });
        },
    );
}
