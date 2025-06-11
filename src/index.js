import express from 'express';
import cors from 'cors';
import { sseCatalog } from './handlers.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Ruta principal para diagnóstico visual
app.get('/', (req, res) => {
  res.send('✅ MCP Learn Catalog API is running. Use /sseCatalog with query parameters.');
});

// Ruta SSE MCP
app.get('/sseCatalog', sseCatalog);

app.listen(port, () => {
  console.log(`✅ MCP Learn Catalog listening on port ${port}`);
});
