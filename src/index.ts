import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const server = new McpServer({
  name: "learnCatalog",
  description: "MCP server para Microsoft Learn Catalog API",
  version: "1.0.0",
  tools: [
    {
      name: "get-catalog",
      description: "Obtener elementos del catálogo de Microsoft Learn",
      parameters: {
        locale: z.string().optional(),
        type:   z.string().optional(),
        level:  z.string().optional(),
        role:   z.string().optional(),
        product:z.string().optional()
      },
    },
  ],
});

// Implementación de la herramienta
server.tool(
  "get-catalog",
  "Obtener elementos del catálogo de Microsoft Learn",
  async ({ locale, type, level, role, product }) => {
    const qs = new URLSearchParams();
    locale  && qs.append("locale",  locale);
    type    && qs.append("type",    type);
    level   && qs.append("level",   level);
    role    && qs.append("role",    role);
    product && qs.append("product", product);
    const url = `https://learn.microsoft.com/api/catalog?${qs.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    return {
      content: [
        { type: "json", data }
      ],
    };
  }
);

const app = express();
const transports: Record<string, SSEServerTransport> = {};

// Endpoint SSE para streaming desde Copilot Studio
app.get("/sse", async (req: Request, res: Response) => {
  const host = req.get("host");
  const fullUri = `https://${host}/catalog`;
  const transport = new SSEServerTransport(fullUri, res);
  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);
  await server.connect(transport);
});

// Endpoint para recibir invocaciones de Copilot Studio
app.post("/catalog", express.json(), async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (!transport) return res.status(400).send("No transport found for sessionId");
  await transport.handlePostMessage(req, res);
});

app.get("/", (_req, res) => {
  res.send("MCP Learn Catalog server running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server listening on http://localhost:${PORT}`)
);
