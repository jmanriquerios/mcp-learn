import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// 1) Creamos el servidor con la lista de herramientas, aquí parámetros vacíos como en el ejemplo
const server = new McpServer({
  name: "learnCatalog",
  description: "MCP server para Microsoft Learn Catalog API",
  version: "1.0.0",
  tools: [
    {
      name: "get-catalog",
      description: "Obtener elementos del catálogo de Microsoft Learn",
      parameters: {},
    },
  ],
});

// 2) Definimos la herramienta igual que en el ejemplo de “get-chuck-joke”
const getCatalog = server.tool(
  "get-catalog",
  "Obtener elementos del catálogo de Microsoft Learn",
  async (params: any) => {
    // destructuramos los cinco parámetros esperados
    const { locale, type, level, role, product } = params;

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
// lookup de sessionId → transport para SSE
const transports: { [sessionId: string]: SSEServerTransport } = {};

// SSE endpoint igual al ejemplo de “/sse”
app.get("/sse", async (req: Request, res: Response) => {
  const host = req.get("host")!;
  const fullUri = `https://${host}/catalog`;
  const transport = new SSEServerTransport(fullUri, res);

  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);

  await server.connect(transport);
});

// POST callback para Copilot Studio, idéntico a “/jokes”
app.post("/catalog", express.json(), async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (!transport) {
    return res.status(400).send("No transport found for sessionId");
  }
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
