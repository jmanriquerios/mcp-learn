import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import axios from 'axios';

const server = new McpServer({
  name: "learn-catalog",
  description: "Microsoft Learn Catalog API Server",
  version: "1.0.0",
  tools: [
    {
      name: "search-modules",
      description: "Search Microsoft Learn modules",
      parameters: {
        query: { type: 'string', description: 'Search query' },
        locale: { type: 'string', description: 'Content locale', default: 'en-us' },
        level: { type: 'string', description: 'Difficulty level', enum: ['beginner', 'intermediate', 'advanced'] }
      }
    },
    {
      name: "get-learning-paths",
      description: "Get Microsoft Learning Paths",
      parameters: {
        locale: { type: 'string', description: 'Content locale', default: 'en-us' },
        role: { type: 'string', description: 'Target role' }
      }
    }
  ]
});

// Search modules tool
const searchModules = server.tool(
  "search-modules",
  "Search Microsoft Learn modules",
  async (params) => {
    const response = await axios.get("https://learn.microsoft.com/api/catalog/", {
      params: { ...params, type: 'modules' },
      headers: { 'Accept': 'application/json' }
    });
    
    return {
      content: [{
        type: "text",
        text: `Found ${response.data.length} modules`,
        data: response.data
      }]
    };
  }
);

// Get learning paths tool
const getLearningPaths = server.tool(
  "get-learning-paths",
  "Get Microsoft Learning Paths",
  async (params) => {
    const response = await axios.get("https://learn.microsoft.com/api/catalog/", {
      params: { ...params, type: 'learningPaths' },
      headers: { 'Accept': 'application/json' }
    });
    
    return {
      content: [{
        type: "text",
        text: `Found ${response.data.length} learning paths`,
        data: response.data
      }]
    };
  }
);

const app = express();

// Transport storage for multiple connections
const transports: { [sessionId: string]: SSEServerTransport } = {};

app.get("/sse", async (req: Request, res: Response) => {
  const host = req.get("host");
  const fullUri = `${req.protocol}://${host}/mcp`;
  const transport = new SSEServerTransport(fullUri, res);

  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

app.get("/", (_req, res) => {
  res.send("✅ Microsoft Learn Catalog MCP server is running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});