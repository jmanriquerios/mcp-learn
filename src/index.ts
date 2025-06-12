import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import cors from 'cors';
import axios from 'axios';

// Define the LearnPath interface based on expected API response structure
interface LearnPath {
  uid: string;
  title: string;
  summary: string;
  url: string;
}

const app = express();
app.use(cors());
app.use(express.json());

// Store active SSE connections
const transports: { [sessionId: string]: SSEServerTransport } = {};

const server = new McpServer({
  name: "learn-catalog",
  description: "Microsoft Learn Catalog API Server",
  version: "1.0.0"
});

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, {
    headers: req.headers,
    query: req.query
  });
  next();
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

// SSE endpoint with proper headers and error handling
app.get("/sse", async (req: Request, res: Response) => {
  try {
    // Set mandatory SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Initialize transport
    const host = req.get("host") || 'localhost';
    const fullUri = `https://${host}/mcp`;
    const transport = new SSEServerTransport(fullUri, res);
    
    console.log(`SSE Connection established - SessionID: ${transport.sessionId}`);
    
    // Store transport
    transports[transport.sessionId] = transport;

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connection',
      sessionId: transport.sessionId,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    }, 15000);

    // Cleanup on connection close
    req.on('close', () => {
      clearInterval(heartbeat);
      delete transports[transport.sessionId];
      console.log(`SSE Connection closed - SessionID: ${transport.sessionId}`);
    });

    await server.connect(transport);
  } catch (error) {
    console.error('SSE Error:', error);
    if (!res.writableEnded) {
      res.status(500).end();
    }
  }
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

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Server Error:', err);
  res.status(500).send('Internal Server Error');
});

// Basic health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

// Proper error handling for server startup
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});