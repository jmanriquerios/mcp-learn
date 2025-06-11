import { fetchCatalog } from './catalogClient.js';

// Solo se permitirán estos parámetros
function sanitizeQueryParams(params) {
  const allowed = ["locale", "type", "level", "subject"];
  const clean = {};
  for (const key of allowed) {
    if (params[key]) {
      clean[key] = params[key];
    }
  }
  return clean;
}

// Handler único para SSE en MCP
export async function sseCatalog(req, res) {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const filteredParams = sanitizeQueryParams(req.query);
    const resp = await fetchCatalog(filteredParams, true);

    for await (const chunk of resp.data) {
      res.write(`data: ${chunk.toString()}\n\n`);
    }

    res.write('event: done\ndata: end\n\n');
    res.end();
  } catch (err) {
    console.error("❌ sseCatalog ERROR:", err.message);
    res.status(500).json({
      error: "Error en SSE del catálogo",
      detalle: err.message
    });
  }
}

