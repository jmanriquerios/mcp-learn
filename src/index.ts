import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import axios from 'axios';

interface LearnPath {
  uid: string;
  title: string;
  summary: string;
  url: string;
}

const server = new McpServer({
  name: "learn-catalog",
  description: "Microsoft Learn Catalog API Server",
  version: "1.0.0"
});

// Get learning paths tool
server.tool(
  "get-learning-paths",
  async (extra: any) => {
    try {
      const params = extra?.params || {};
      console.log('Fetching learning paths with params:', params);

      const response = await axios.get("https://learn.microsoft.com/api/catalog", {
        params: {
          type: 'modules',
          locale: params.locale || 'es-es',
          role: params.role || 'developer'
        },
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('API Response:', response.data);

      return {
        content: [{
          type: "text",
          text: `Found ${response.data.length} learning paths`,
          data: response.data.map((path: LearnPath) => ({
            uid: path.uid,
            title: path.title,
            summary: path.summary,
            url: path.url
          }))
        }]
      };
    } catch (error) {
      console.error('Error fetching learning paths:', error);
      return {
        content: [{
          type: "text",
          text: "Error fetching learning paths"
        }],
        isError: true
      };
    }
  }
);

const app = express();
app.use(express.json());

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
  console.log('MCP Request:', {
    sessionId,
    body: req.body
  });

  const transport = transports[sessionId];
  if (transport) {
    try {
      await transport.handlePostMessage(req, res);
    } catch (error) {
      console.error('MCP Error:', error);
      res.status(500).json({
        jsonrpc: "2.0",
        id: req.body?.id,
        error: {
          code: -32000,
          message: "Internal server error"
        }
      });
    }
  } else {
    console.warn('No transport found for sessionId:', sessionId);
    res.status(400).json({
      jsonrpc: "2.0",
      id: req.body?.id,
      error: {
        code: -32001,
        message: "No transport found for sessionId"
      }
    });
  }
});

app.get("/", (_req, res) => {
  res.send("✅ Microsoft Learn Catalog MCP server is running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});