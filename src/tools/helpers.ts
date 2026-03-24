import type { Row } from "../backends/base.js";

export function getField(row: Row, ...names: string[]): unknown {
    for (const name of names) {
        if (name in row) {
            return row[name];
        }

        const found = Object.keys(row).find(
            (key) => key.toLowerCase() === name.toLowerCase(),
        );
        if (found) {
            return row[found];
        }
    }
    return undefined;
}

export function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
}

export function toBoolean(value: unknown): boolean {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        return value !== 0;
    }
    if (typeof value === "string") {
        return ["1", "true", "yes"].includes(value.toLowerCase());
    }
    return false;
}

export function toDate(value: unknown): Date | undefined {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return undefined;
}

export function normalizeForJson(input: unknown): unknown {
    if (input === null || input === undefined) {
        return input;
    }

    if (input instanceof Date) {
        return input.toISOString();
    }

    if (typeof input === "bigint") {
        const asNumber = Number(input);
        return Number.isSafeInteger(asNumber) ? asNumber : input.toString();
    }

    if (Array.isArray(input)) {
        return input.map((item) => normalizeForJson(item));
    }

    if (Buffer.isBuffer(input)) {
        return input.toString("base64");
    }

    if (typeof input === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(
            input as Record<string, unknown>,
        )) {
            result[key] = normalizeForJson(value);
        }
        return result;
    }

    return input;
}

export function jsonResult(data: unknown) {
    return {
        content: [
            {
                type: "text" as const,
                text: JSON.stringify(normalizeForJson(data), null, 2),
            },
        ],
    };
}

export function isDeleted(row: Row): boolean {
    return toBoolean(getField(row, "Deleted"));
}

export function parseInputDate(
    value: string | undefined,
    endOfDay = false,
): Date | undefined {
    if (!value) {
        return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(
            `Invalid date format: ${value}. Expected ISO date string.`,
        );
    }

    if (endOfDay) {
        date.setHours(23, 59, 59, 999);
    } else {
        date.setHours(0, 0, 0, 0);
    }

    return date;
}

export function inDateRange(value: unknown, from?: Date, to?: Date): boolean {
    const date = toDate(value);
    if (!date) {
        return false;
    }

    if (from && date < from) {
        return false;
    }

    if (to && date > to) {
        return false;
    }

    return true;
}
