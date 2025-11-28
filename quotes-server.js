// Local quotes server (CommonJS) using node-fetch and Yahoo Chart v8 endpoint
// Serves static files and exposes /quote?symbol=... and /quotes endpoints
// Run with: npm install node-fetch@2 && node quotes-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const fetch = require('node-fetch');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname);

async function getQuote(ticker) {
  console.log(`Fetching quote for ${ticker}`);
  const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
  const resp = await fetch(endpoint);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  const result = data.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data returned for ${ticker}`);
  }
  return {
    symbol: ticker,
    price: result.meta.regularMarketPrice,
    prevClose: result.meta.previousClose,
    timestamp: Array.isArray(result.timestamp) ? result.timestamp[result.timestamp.length - 1] : null
  };
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Log static file requests to help debug missing assets (e.g. styles.css)
  console.log(`Static request: ${pathname} -> ${filePath}`);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.warn(`Static file not found: ${filePath} (${err.code})`);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    // Add explicit charset for text/* types and a no-cache header to make debugging easier
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  // Endpoint: /quote?symbol=MES=F
  if (req.method === 'GET' && parsed.pathname === '/quote') {
  let symbol = parsed.query.symbol;
    if (!symbol) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing symbol query param' }));
      return;
    }
      // Always append '=F' if not present
      if (!symbol.endsWith('=F')) {
        symbol = symbol + '=F';
      }
    try {
      const q = await getQuote(symbol);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(q));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  // Keep previous /quotes for compatibility (returns MES=F and NQ=F)
  if (req.method === 'GET' && parsed.pathname === '/quotes') {
    try {
      const out = [];
        for (const t of ['MES', 'NQ']) {
          let symbol = t;
          if (!symbol.endsWith('=F')) symbol = symbol + '=F';
          try {
            out.push(await getQuote(symbol));
          } catch (err) {
            out.push({ symbol: symbol, error: String(err) });
          }
        }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  // Otherwise serve static files (index.html, styles.css, script.js)
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
