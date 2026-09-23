// Loopback-only static server for the exact production build, with SPA fallback.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../build');
http.createServer((req, res) => {
  const requested = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!requested.startsWith(root + path.sep) && requested !== root) { res.writeHead(403).end(); return; }
  const file = fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(root, 'index.html');
  res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(file).pipe(res);
}).listen(3100, '127.0.0.1', () => console.log('Testbuild bereikbaar op http://127.0.0.1:3100'));
