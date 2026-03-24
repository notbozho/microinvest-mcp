import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MicroinvestBackend } from "../backends/base.js";
import {
    getField,
    isDeleted,
    jsonResult,
    toDate,
    toNumber,
} from "./helpers.js";

function estimatePartnerDelta(operType: number, amount: number): number {
    const debitTypes = new Set([2, 11, 14, 15]);
    const creditTypes = new Set([1, 3, 16, 17, 19]);

    if (debitTypes.has(operType)) {
        return amount;
    }

    if (creditTypes.has(operType)) {
        return -amount;
    }

    return 0;
}

export function registerPartnersTools(
    server: McpServer,
    backend: MicroinvestBackend,
): void {
    server.tool(
        "search_partners",
        "Search customers/suppliers by name or code. Excludes deleted records.",
        {
            query: z.string().min(1),
        },
        async ({ query }) => {
            const needle = query.trim().toLowerCase();
            const partners = await backend.getTable("partners");

            const rows = partners
                .filter((row) => !isDeleted(row))
                .filter((row) => {
                    const name = String(
                        getField(row, "Name") ?? "",
                    ).toLowerCase();
                    const code = String(
                        getField(row, "Code") ?? "",
                    ).toLowerCase();
                    return name.includes(needle) || code.includes(needle);
                });

            return jsonResult(rows);
        },
    );

    server.tool(
        "get_partner",
        "Get full partner details by ID. Excludes deleted records.",
        {
            id: z.number().int(),
        },
        async ({ id }) => {
            const [partners, groups] = await Promise.all([
                backend.getTable("partners"),
                backend.getTable("partnersgroups"),
            ]);
            const partner = partners.find(
                (row) =>
                    toNumber(getField(row, "ID")) === id && !isDeleted(row),
            );

            if (!partner) {
                throw new Error(`Partner not found: ${id}`);
            }

            const group = groups.find(
                (row) =>
                    toNumber(getField(row, "ID")) ===
                    toNumber(getField(partner, "GroupID")),
            );

            return jsonResult({
                ...partner,
                groupName: getField(group ?? {}, "Name") ?? null,
            });
        },
    );

    server.tool(
        "get_partner_balance",
        "Estimate partner outstanding balance from operations ledger (positive means partner owes you).",
        {
            partnerId: z.number().int(),
        },
        async ({ partnerId }) => {
            const [partners, operations] = await Promise.all([
                backend.getTable("partners"),
                backend.getTable("operations"),
            ]);
            const partner = partners.find(
                (row) => toNumber(getField(row, "ID")) === partnerId,
            );
            if (!partner) {
                throw new Error(`Partner not found: ${partnerId}`);
            }

            const partnerOps = operations.filter(
                (row) => toNumber(getField(row, "PartnerID")) === partnerId,
            );
            let balance = 0;
            let lastDate: Date | undefined;

            for (const row of partnerOps) {
                const qtty = toNumber(getField(row, "Qtty"));
                const priceOut = toNumber(getField(row, "PriceOut"));
                const priceIn = toNumber(getField(row, "PriceIn"));
                const amount = qtty * (priceOut !== 0 ? priceOut : priceIn);
                balance += estimatePartnerDelta(
                    toNumber(getField(row, "OperType"), -1),
                    amount,
                );

                const date = toDate(getField(row, "Date", "UserRealTime"));
                if (date && (!lastDate || date > lastDate)) {
                    lastDate = date;
                }
            }

            return jsonResult({
                partnerId,
                partnerName: getField(partner, "Name") ?? null,
                operationCount: partnerOps.length,
                balance,
                lastOperationDate: lastDate ?? null,
                note: "Balance is estimated from operations using OperType sign rules and may differ from UI-calculated balances.",
            });
        },
    );
}
