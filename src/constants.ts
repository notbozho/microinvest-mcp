export const OPER_TYPE_NAMES: Record<number, string> = {
    1: "Purchase/Delivery",
    2: "Sale",
    3: "Return from client",
    4: "Stocktake/Revision",
    5: "Write-off/Waste",
    6: "Transfer between objects",
    7: "Production",
    8: "Complex Production",
    9: "Consignment give",
    10: "Consignment return",
    11: "Proforma invoice",
    12: "Order",
    13: "Offer/Quote",
    14: "Invoice",
    15: "Debit note",
    16: "Credit note",
    17: "Advance payment",
    18: "Cash book entry",
    19: "Received invoice",
    20: "Request",
};

export function getOperTypeName(operType: number | undefined): string {
    if (operType === undefined || operType === null) {
        return "Unknown";
    }
    return OPER_TYPE_NAMES[operType] ?? "Unknown";
}
