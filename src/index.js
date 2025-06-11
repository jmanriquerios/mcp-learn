import express from 'express';
import cors from 'cors';
import { sseCatalog } from './handlers.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());


// Ruta SSE MCP
app.get('/sseCatalog', sseCatalog);

app.listen(port, () => {
  console.log(`✅ MCP Learn Catalog listening on port ${port}`);
});
