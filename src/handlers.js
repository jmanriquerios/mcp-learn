import { fetchCatalog } from './catalogClient.js';

export async function searchCatalog(req, res) {
  try {
    const resp = await fetchCatalog(req.query);
    let data = '', chunk;
    for await (chunk of resp.data) data += chunk;
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).send(err.toString());
  }
}

export async function streamCatalog(req, res) {
  try {
    res.setHeader('Content-Type', 'application/json');
    const resp = await fetchCatalog(req.query);
    resp.data.pipe(res);
  } catch (err) {
    res.status(500).send(err.toString());
  }
}

export async function sseCatalog(req, res) {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const resp = await fetchCatalog(req.query);
    for await (const chunk of resp.data) {
      const text = chunk.toString();
      res.write(`data: ${text}\n\n`);
    }
    res.write('event: done\ndata: end\n\n');
    res.end();
  } catch (err) {
    res.status(500).send(err.toString());
  }
}
