// src/index.ts

import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

// 1) Definimos el esquema Zod para los parámetros
const catalogParams = z.object({
  locale:   z.string().optional(),
  type:     z.string().optional(),
  level:    z.string().optional(),
  role:     z.string().optional(),
  product:  z.string().optional()
});
export type CatalogParams = z.infer<typeof catalogParams>;

// 2) Creamos el servidor y ya incluimos description + parameters
const server = new McpServer({
  name:        "learnCatalog",
  description: "MCP server para Microsoft Learn Catalog API",
  version:     "1.0.0",
  tools: [
    {
      name:        "get-catalog",
      description: "Obtener elementos del catálogo de Microsoft Learn",
      parameters:  catalogParams,
    },
  ],
});

// 3) Registramos la herramienta con 2 argumentos: name + handler
server.tool("get-catalog", async (params: CatalogParams) => {
  const qs = new URLSearchParams();
  if (params.locale)  qs.append("locale",  params.locale);
  if (params.type)    qs.append("type",    params.type);
  if (params.level)   qs.append("level",   params.level);
  if (params.role)    qs.append("role",    params.role);
  if (params.product) qs.append("product", params.product);

  const url = `https://learn.microsoft.com/api/catalog?${qs.toString()}`;
  const res = await fetch(url);
  const data = await res.json();

  return {
    content: [{ type: "json", data }],
  };
});

const app = express();
const transports: Record<string, SSEServerTransport> = {};

// SSE endpoint
app.get("/sse", async (req: Request, res: Response) => {
  const host    = req.get("host")!;
  const fullUri = `https://${host}/catalog`;
  const transport = new SSEServerTransport(fullUri, res);

  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);

  await server.connect(transport);
});

// Callback POST
app.post("/catalog", express.json(), async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (!transport) return res.status(400).send("No transport found for sessionId");
  await transport.handlePostMessage(req, res);
});

// Health check
app.get("/", (_req, res) => {
  res.send("MCP Learn Catalog server running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server listening on http://localhost:${PORT}`)
);
