import { fetchCatalog } from './catalogClient.js';

export async function searchCatalog(req, res) {
  try {
    const resp = await fetchCatalog(req.query, false);  // JSON completo
    if (!resp.data || typeof resp.data !== 'object') {
      throw new Error("Unexpected response format");
    }
    res.json(resp.data);
  } catch (err) {
    console.error("❌ searchCatalog ERROR:", err.message);
    res.status(500).json({ error: "Error al obtener el catálogo", detalle: err.message });
  }
}

export async function streamCatalog(req, res) {
  try {
    res.setHeader('Content-Type', 'application/json');
    const resp = await fetchCatalog(req.query, true);  // modo stream
    if (!resp.data || !resp.data.pipe) {
      throw new Error("La respuesta no es un stream válido");
    }
    resp.data.pipe(res);
  } catch (err) {
    console.error("❌ streamCatalog ERROR:", err.message);
    res.status(500).json({ error: "Error en transmisión del catálogo", detalle: err.message });
  }
}

export async function sseCatalog(req, res) {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const resp = await fetchCatalog(req.query, true);
    if (!resp.data || typeof resp.data[Symbol.asyncIterator] !== 'function') {
      throw new Error("No se puede iterar sobre el stream");
    }

    for await (const chunk of resp.data) {
      const text = chunk.toString();
      res.write(`data: ${text}\n\n`);
    }

    res.write('event: done\ndata: end\n\n');
    res.end();
  } catch (err) {
    console.error("❌ sseCatalog ERROR:", err.message);
    res.status(500).json({ error: "Error en SSE del catálogo", detalle: err.message });
  }
}
