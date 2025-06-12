const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint MCP para Copilot Studio - Ruta raíz
app.get('/', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default-session';
    const query = req.query.query || '';
    
    console.log(`[${sessionId}] MCP Request received:`, req.query);
    
    // Headers obligatorios para SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });

    // Simular búsqueda en el catálogo de Microsoft Learn
    const mockResults = await searchLearnCatalog(query);
    
    // Formato de respuesta MCP requerido por Copilot Studio
    const mcpResponse = {
      jsonrpc: "2.0",
      id: sessionId,
      result: {
        content: [
          {
            type: "text",
            text: formatResultsForCopilot(mockResults, query)
          }
        ]
      }
    };
    
    console.log(`[${sessionId}] Sending MCP response:`, JSON.stringify(mcpResponse, null, 2));
    
    // Enviar como Server-Sent Event
    res.write(`data: ${JSON.stringify(mcpResponse)}\n\n`);
    
    // Cerrar conexión después de enviar los datos
    setTimeout(() => {
      res.end();
    }, 100);
    
  } catch (error) {
    console.error('Error in MCP endpoint:', error);
    
    // Respuesta de error en formato MCP
    const errorResponse = {
      jsonrpc: "2.0",
      id: req.query.sessionId || 'error-session',
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message
      }
    };
    
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
});

// Función para buscar en el catálogo (simulada)
async function searchLearnCatalog(query) {
  // Simular resultados del catálogo de Microsoft Learn
  const mockData = [
    {
      id: "azure-functions-intro",
      title: "Introduction to Azure Functions",
      description: "Learn how to create serverless functions with Azure Functions",
      url: "https://learn.microsoft.com/azure/azure-functions/",
      type: "module",
      level: "beginner",
      duration: "45 minutes"
    },
    {
      id: "azure-storage-basics",
      title: "Azure Storage fundamentals",
      description: "Understand Azure Storage services and their use cases",
      url: "https://learn.microsoft.com/azure/storage/",
      type: "learning-path",
      level: "beginner",
      duration: "2 hours"
    }
  ];
  
  // Filtrar por query si existe
  if (query) {
    return mockData.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  return mockData;
}

// Formatear resultados para que Copilot Studio los entienda
function formatResultsForCopilot(results, query) {
  if (!results || results.length === 0) {
    return `No encontré contenido de Microsoft Learn para "${query}". ¿Podrías intentar con otros términos?`;
  }
  
  let response = `Encontré ${results.length} recursos de Microsoft Learn`;
  if (query) {
    response += ` relacionados con "${query}"`;
  }
  response += ":\n\n";
  
  results.forEach((item, index) => {
    response += `${index + 1}. **${item.title}**\n`;
    response += `   📝 ${item.description}\n`;
    response += `   🔗 ${item.url}\n`;
    response += `   ⏱️ Duración: ${item.duration}\n`;
    response += `   📊 Nivel: ${item.level}\n\n`;
  });
  
  response += "¿Te gustaría que busque algo más específico?";
  
  return response;
}

// Mantener también el endpoint /sse para compatibilidad
app.get('/sse', async (req, res) => {
  // Redirigir a la misma lógica
  return app._router.handle(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0'
  });
});

// Test endpoint para verificar que funciona
app.get('/test', (req, res) => {
  res.json({
    message: 'MCP Server is working',
    timestamp: new Date().toISOString(),
    query: req.query
  });
});

// Handle OPTIONS requests for CORS
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MCP Learn Catalog Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Test endpoint: http://localhost:${port}/test`);
  console.log(`MCP endpoint: http://localhost:${port}/sse`);
});