// Static field-guide server. No dependencies, no outbound calls, GET/HEAD only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
};
const HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; style-src 'self'; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'cache-control': 'no-store',
};
const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;
const MODE = process.env.MODE ?? 'mock';
if (MODE !== 'mock') throw new Error(`MODE must be mock (this app has no live mode), got ${MODE}`);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

export function createServer({ hosted = false } = {}) {
  return http.createServer((req, res) => {
    const send = (code, type, body) => { res.writeHead(code, { ...HEADERS, 'content-type': type }); res.end(req.method === 'HEAD' ? undefined : body); };
    if (req.method !== 'GET' && req.method !== 'HEAD' && !(req.method === 'POST' && new URL(req.url, 'http://x').pathname === '/api/mode')) return send(405, 'text/plain', 'method not allowed');
    if (!LOOPBACK_HOST.test(req.headers.host || '')) return send(421, 'text/plain', 'bad host');
    const p = new URL(req.url, 'http://x').pathname;
    if (p === '/api/health') return send(200, 'application/json', JSON.stringify({ schema: 'demo-health/1', at: new Date().toISOString(), state: 'ready', runtime: 'offline', mode: 'mock-only', demo: { id: 'demo-field-guide', name: 'Demo field guide', version: pkg.version } }));
    if (p === '/api/info') return send(200, 'application/json', JSON.stringify({ mode: MODE, simulated: false, hosted, kind: 'static-handoff-page', realAvailable: false }));
    // rule 19 mode switch route: POST /api/mode (app.post('/api/mode', ...)). This
    // app is static and mock-only, so any switch request is refused with 409 per the
    // rulebook ("Real not configured: server answers 409"). realAvailable is always
    // false; see /api/info.
    if (p === '/api/mode' && req.method === 'POST') {
      // rule 19: this app is static and mock-only — there is no Real mode to switch to.
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
      req.on('end', () => send(409, 'application/json', JSON.stringify({ error: 'real_not_available', message: 'This app is a static handoff page; it has no Real mode.' })));
      return;
    }
    if (p === '/api/cards') {
      try {
        const deck = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cards.json'), 'utf8'));
        return send(200, 'application/json', JSON.stringify({ title: deck.title, baseUrl: deck.baseUrl, sections: deck.sections.length }));
      } catch { return send(500, 'text/plain', 'cards.json unreadable'); }
    }
    const f = FILES[p];
    if (!f) return send(404, 'text/plain', 'not found');
    try { return send(200, f[1], fs.readFileSync(path.join(root, 'dist', f[0]))); } catch { return send(503, 'text/plain', 'not built: run npm run build'); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 7590);
  const bind = process.env.BIND ?? '127.0.0.1';
  createServer({ hosted: process.env.HOSTED === '1' }).listen(port, bind, () => console.log(`demo-field-guide on http://${bind}:${port}`));
}
