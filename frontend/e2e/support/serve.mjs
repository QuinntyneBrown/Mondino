// Serves the production build for the e2e specs: static files from dist, and index.html for
// every other address, as the deployed app does. No dependency, no network beyond localhost.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../dist/mondino/browser', import.meta.url)));
const port = Number(process.env.E2E_PORT ?? 4310);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  if (pathname.startsWith('/api/')) {
    // The specs answer the API from fixtures. A request that reaches here was not answered.
    response.writeHead(599, { 'content-type': 'text/plain' }).end('unanswered API request');
    return;
  }
  const file = normalize(join(root, decodeURIComponent(pathname)));
  const candidates = file.startsWith(root) && extname(file) ? [file] : [];
  candidates.push(join(root, 'index.html'));
  for (const candidate of candidates) {
    try {
      const body = await readFile(candidate);
      response
        .writeHead(200, { 'content-type': types[extname(candidate)] ?? 'application/octet-stream' })
        .end(body);
      return;
    } catch {
      // Try the next candidate.
    }
  }
  response.writeHead(404).end();
}).listen(port, '127.0.0.1', () => console.log(`e2e: serving ${root} on http://127.0.0.1:${port}`));
