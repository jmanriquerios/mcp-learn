// src/index.ts
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const server = new McpServer({
  name: "learnCatalog",
  description: "MCP server para Microsoft Learn Catalog API",
  version: "1.0.0",
  tools: [
    {
      name: "get-catalog",
      description: "Obtener elementos del catálogo de Microsoft Learn",
      parameters: {},               // igual que en el ejemplo de Jokes MCP
    },
  ],
});

// IMPORTANTE: 3 args, y handler recibe todo el objeto `extra`
server.tool(
  "get-catalog",
  "Obtener elementos del catálogo de Microsoft Learn",
  async (extra: any) => {
    // extra.parameters trae tus cinco parámetros
    const { locale, type, level, role, product } = extra.parameters as {
      locale?: string;
      type?: string;
      level?: string;
      role?: string;
      product?: string;
    };

    const qs = new URLSearchParams();
    if (locale)  qs.append("locale",  locale);
    if (type)    qs.append("type",    type);
    if (level)   qs.append("level",   level);
    if (role)    qs.append("role",    role);
    if (product) qs.append("product", product);

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

app.get("/sse", async (req: Request, res: Response) => {
  const host = req.get("host")!;
  const fullUri = `https://${host}/catalog`;
  const transport = new SSEServerTransport(fullUri, res);
  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);
  await server.connect(transport);
});

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
