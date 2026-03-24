import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBackend } from "./backends/index.js";
import { loadConfig } from "./config.js";
import { registerAdminTools } from "./tools/config.js";
import { registerGoodsTools } from "./tools/goods.js";
import { registerInventoryTools } from "./tools/inventory.js";
import { registerOperationsTools } from "./tools/operations.js";
import { registerPartnersTools } from "./tools/partners.js";
import { registerReportsTools } from "./tools/reports.js";

async function main(): Promise<void> {
    const config = loadConfig();
    const backend = await createBackend(config);

    const server = new McpServer({
        name: "microinvest-mcp",
        version: "1.0.0",
    });

    registerGoodsTools(server, backend);
    registerInventoryTools(server, backend);
    registerOperationsTools(server, backend);
    registerPartnersTools(server, backend);
    registerReportsTools(server, backend);
    registerAdminTools(server, backend);

    const shutdown = async () => {
        await backend.close();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Failed to start microinvest-mcp:", error);
    process.exit(1);
});
