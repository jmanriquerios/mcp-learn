import express from 'express';
import cors from 'cors';
import { sseCatalog } from './handlers.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.get('/sseCatalog', sseCatalog);

app.listen(port, () => {
  console.log(`✅ MCP Learn Catalog listening on port ${port}`);
});

