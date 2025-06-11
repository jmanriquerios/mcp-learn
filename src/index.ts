// src/index.ts
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const server = new McpServer({
  name: "learnCatalog",
  description: "MCP server para Microsoft Learn Catalog API",
  version: "1.0.0",
});

// Definir la herramienta con parámetros completos
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "get-catalog",
        description: "Obtener elementos del catálogo de Microsoft Learn",
        inputSchema: {
          type: "object",
          properties: {
            locale: {
              type: "string",
              description: "Código de idioma (ej: es-es, en-us)",
              default: "en-us"
            },
            type: {
              type: "string",
              description: "Tipo de contenido (module, learningPath, etc.)",
            },
            level: {
              type: "string",
              description: "Nivel de dificultad (beginner, intermediate, advanced)",
            },
            role: {
              type: "string",
              description: "Rol objetivo (developer, administrator, etc.)",
            },
            product: {
              type: "string",
              description: "Producto de Microsoft (azure, office365, etc.)",
            }
          },
          additionalProperties: false
        }
      }
    ]
  };
});

// Handler para ejecutar herramientas
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name !== "get-catalog") {
    throw new Error(`Herramienta desconocida: ${request.params.name}`);
  }

  const { locale, type, level, role, product } = request.params.arguments as {
    locale?: string;
    type?: string;
    level?: string;
    role?: string;
    product?: string;
  };

  try {
    const qs = new URLSearchParams();
    if (locale) qs.append("locale", locale);
    if (type) qs.append("type", type);
    if (level) qs.append("level", level);
    if (role) qs.append("role", role);
    if (product) qs.append("product", product);

    const url = `https://learn.microsoft.com/api/catalog?${qs.toString()}`;
    console.log(`Fetching: ${url}`);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();

    return {
      content: [
        {
          type: "text",
          text: `Catálogo de Microsoft Learn obtenido exitosamente. Encontrados ${data.modules?.length || 0} módulos y ${data.learningPaths?.length || 0} rutas de aprendizaje.`
        },
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error al obtener el catálogo: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }
      ],
      isError: true
    };
  }
});

const app = express();
const transports: Record<string, SSEServerTransport> = {};

// Endpoint SSE para establecer conexión
app.get("/sse", async (req: Request, res: Response) => {
  try {
    const transport = new SSEServerTransport("/message", res);
    transports[transport.sessionId] = transport;
    
    res.on("close", () => {
      delete transports[transport.sessionId];
      console.log(`Conexión SSE cerrada: ${transport.sessionId}`);
    });

    await server.connect(transport);
    console.log(`Nueva conexión SSE establecida: ${transport.sessionId}`);
  } catch (error) {
    console.error("Error establishing SSE connection:", error);
    res.status(500).send("Error establishing connection");
  }
});

// Endpoint para manejar mensajes POST
app.post("/message", express.json(), async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }
  
  const transport = transports[sessionId];
  if (!transport) {
    return res.status(400).json({ error: "No transport found for sessionId" });
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Error handling POST message:", error);
    res.status(500).json({ error: "Error processing message" });
  }
});

// Endpoint de salud
app.get("/", (_req, res) => {
  res.json({
    name: "MCP Learn Catalog Server",
    status: "running",
    version: "1.0.0",
    activeConnections: Object.keys(transports).length
  });
});

// Endpoint de salud detallado
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeTransports: Object.keys(transports).length
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ MCP Learn Catalog Server listening on http://localhost:${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`📬 Message endpoint: http://localhost:${PORT}/message`);
});