import express from 'express';
import { searchCatalog, streamCatalog, sseCatalog } from './handlers.js';

const app = express();
const port = process.env.PORT || 3000;

app.get('/searchCatalog', searchCatalog);
app.get('/streamCatalog', streamCatalog);
app.get('/sseCatalog', sseCatalog);

app.listen(port, () => {
  console.log(`MCP server listening on port ${port}`);
});
