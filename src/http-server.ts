import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server";
import { VERSION } from "./version";

const PORT = Number(process.env.PORT ?? 3000);

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, mcp-protocol-version, Authorization");
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Narzędzia tego serwera są tylko do czytania i niezależne od siebie, więc nie ma
  // czego trzymać między requestami. Tryb stateless usuwa wyciek sesji: klienci,
  // którzy rozłączają się bez DELETE, zapychali mapę sesji do limitu i serwer
  // odpowiadał 503 aż do restartu.
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json", "Allow": "POST, OPTIONS" });
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    }));
    return;
  }

  // Każdy request stateless potrzebuje własnej pary server + transport.
  const mcpServer = createMcpServer(); // no outputDir — HTTP mode has no local file system
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  let closed = false;
  const cleanup = (): void => {
    if (closed) return;
    closed = true;
    void (async () => {
      try {
        await transport.close();
      } finally {
        await mcpServer.close();
      }
    })().catch((err: unknown) => {
      process.stderr.write(`[UODO-MCP] Błąd zwalniania zasobów: ${err}\n`);
    });
  };

  // Zasoby żyją do zakończenia (lub zerwania) odpowiedzi HTTP.
  res.once("close", cleanup);

  try {
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);
  } catch (err) {
    cleanup();
    throw err;
  }
}

const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  try {
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        server: "UODO-MCP",
        version: VERSION,
        sessionMode: "stateless",
      }));
      return;
    }

    if (url.pathname === "/mcp") {
      await handleMcp(req, res);
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
    process.stderr.write(`[UODO-MCP] Błąd: ${err}\n`);
  }
});

httpServer.listen(PORT, () => {
  process.stderr.write(`[UODO-MCP] HTTP server nasłuchuje na porcie ${PORT}\n`);
  process.stderr.write(`[UODO-MCP] Endpoint MCP: http://localhost:${PORT}/mcp\n`);
  process.stderr.write(`[UODO-MCP] Health check: http://localhost:${PORT}/health\n`);
});

process.on("SIGINT", () => { httpServer.close(); process.exit(0); });
process.on("SIGTERM", () => { httpServer.close(); process.exit(0); });
