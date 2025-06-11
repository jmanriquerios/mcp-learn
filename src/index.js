import express from 'express';
import cors from 'cors';
import { sseCatalog } from './handlers.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware básico
app.use(cors());

// Ruta única MCP SSE
app.get('/sseCatalog', sseCatalog);

// Servidor
app.listen(port, () => {
  console.log(`✅ MCP Learn Catalog listening on port ${port}`);
});
