import express from 'express';
import cors from 'cors';
import { sseCatalog } from './handlers.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// ✔ Ruta principal para verificación de estado
app.get('/', (req, res) => {
  res.send('✅ MCP Learn Catalog is running. Try /sseCatalog?locale=es-es&type=modules');
});

// ✔ Ruta MCP SSE
app.get('/sseCatalog', sseCatalog);

app.listen(port, () => {
  console.log(`✅ MCP Learn Catalog listening on port ${port}`);
});
