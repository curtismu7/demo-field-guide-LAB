import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateDeck, render, escapeHtml, build } from '../scripts/build.mjs';
import { createServer, allowedExtraHosts } from '../server/index.js';

const validDeck = {
  title: 'T', eyebrow: 'E', baseUrl: 'http://127.0.0.1:1',
  sections: [{ id: 's1', name: 'S1', cards: [{ title: 'C', route: '/r', what: 'w', steps: ['a'] }] }],
};

test('validateDeck accepts a valid deck', () => {
  assert.deepEqual(validateDeck(validDeck), []);
});

test('validateDeck rejects missing fields, dup routes, bad tone', () => {
  const bad = {
    baseUrl: 'x',
    sections: [
      { id: 'a', name: 'A', cards: [{ title: 'C1', route: '/dup', what: 'w' }] },
      { id: 'b', name: 'B', cards: [{ title: 'C2', route: '/dup', what: 'w', badgeTone: 'purple' }, { what: 'no title no route' }] },
    ],
  };
  const errors = validateDeck(bad);
  assert.ok(errors.some((e) => e.includes('missing "title"')));
  assert.ok(errors.some((e) => e.includes('duplicate route: /dup')));
  assert.ok(errors.some((e) => e.includes('badgeTone')));
});

test('validateDeck rejects credential-shaped text in cards', () => {
  const leaky = {
    title: 'T', baseUrl: 'x',
    sections: [{ id: 's', name: 'S', cards: [{ title: 'C', route: '/r', what: 'w', steps: ['sign in with password: hunter2'] }] }],
  };
  const errors = validateDeck(leaky);
  assert.ok(errors.some((e) => e.includes('possible credential')), JSON.stringify(errors));
});

test('escapeHtml neutralizes hostile card text', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(escapeHtml('" onclick="'), '&quot; onclick=&quot;');
});

test('render escapes hostile deck content and builds links from baseUrl', () => {
  const hostile = {
    title: '<img src=x onerror=alert(1)>', eyebrow: 'E', baseUrl: 'http://base',
    credentialsNote: 'not here',
    sections: [{ id: 's', name: 'S<', cards: [{ title: 'C"', route: '/r?x=<y>', what: 'w & <z>' }] }],
  };
  const html = render(hostile);
  assert.ok(!html.includes('<img src=x'), 'hostile title must be escaped');
  assert.ok(html.includes('&lt;img'), 'escaped title present');
  assert.ok(html.includes('href="http://base/r?x=&lt;y&gt;"'), 'link built from baseUrl');
  assert.ok(html.includes('not here'), 'credentials note rendered');
});

test('build() writes dist from data and validation gates it', () => {
  const root = path.dirname(new URL(import.meta.url, 'file://').pathname);
  // main repo data is valid, so build succeeds
  build();
  assert.ok(fs.existsSync(path.join(root, '..', 'dist', 'index.html')));
  const html = fs.readFileSync(path.join(root, '..', 'dist', 'index.html'), 'utf8');
  assert.ok(html.includes('Example card'), 'deck content rendered');
  assert.ok(!html.includes('__SECTIONS__'), 'template placeholders replaced');
});

test('server: health, info, cards, 404, 405, host check', async () => {
  const server = createServer();
  const port = await new Promise((res) => server.listen(0, '127.0.0.1', () => res(server.address().port)));
  const get = (pathName, host = `127.0.0.1:${port}`, method = 'GET') =>
    new Promise((res) => {
      http.get({ host: '127.0.0.1', port, path: pathName, headers: { host }, method }, (r) => {
        let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res({ status: r.statusCode, body: b }));
      }).on('error', () => res({ status: 0, body: '' }));
    });
  const health = await get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(JSON.parse(health.body).schema, 'demo-health/1');
  const info = await get('/api/info');
  assert.equal(JSON.parse(info.body).kind, 'static-handoff-page');
  const cards = await get('/api/cards');
  assert.equal(cards.status, 200);
  assert.ok(JSON.parse(cards.body).title);
  assert.equal((await get('/nope')).status, 404);
  assert.equal((await get('/', `127.0.0.1:${port}`, 'POST')).status, 405);
  assert.equal((await get('/', 'evil.example')).status, 421);
  await new Promise((res) => server.close(res));
});

test('deck renders without credentials anywhere in output', () => {
  const html = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url, 'file://').pathname), '..', 'dist', 'index.html'), 'utf8');
  assert.ok(!/password\s*[:=]/i.test(html), 'no credential assignments in rendered page');
});

test('rule 19: /api/mode answers 409 (no Real mode) and /api/info reports realAvailable:false', async () => {
  const server = createServer();
  const port = await new Promise((res) => server.listen(0, '127.0.0.1', () => res(server.address().port)));
  const post = (p) => new Promise((res) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method: 'POST', headers: { host: `127.0.0.1:${port}`, 'content-type': 'application/json' } }, (resp) => {
      let b = ''; resp.on('data', (c) => (b += c)); resp.on('end', () => res({ status: resp.statusCode, body: b }));
    });
    r.write(JSON.stringify({ source: 'real' })); r.end();
  });
  const info = await new Promise((res) => {
    http.get({ host: '127.0.0.1', port, path: '/api/info', headers: { host: `127.0.0.1:${port}` } }, (resp) => {
      let b = ''; resp.on('data', (c) => (b += c)); resp.on('end', () => res({ status: resp.statusCode, body: b }));
    });
  });
  assert.equal(JSON.parse(info.body).realAvailable, false);
  const mode = await post('/api/mode');
  assert.equal(mode.status, 409);
  assert.equal(JSON.parse(mode.body).error, 'real_not_available');
  await new Promise((res) => server.close(res));
});

test('LAB_ALLOWED_HOSTS: a named host (any port) is served, others stay 421, a bad name throws', async () => {
  assert.deepEqual([...allowedExtraHosts({ LAB_ALLOWED_HOSTS: 'demo-field-guide.local.ping-devops.com, Other.Example' })], ['demo-field-guide.local.ping-devops.com', 'other.example']);
  assert.throws(() => allowedExtraHosts({ LAB_ALLOWED_HOSTS: 'bad host!' }), /not a host name/);
  const server = createServer({ allowedHosts: allowedExtraHosts({ LAB_ALLOWED_HOSTS: 'demo-field-guide.local.ping-devops.com' }) });
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  const get = (host) => new Promise((resolve, reject) => { http.get({ port, host: '127.0.0.1', path: '/api/health', headers: { host } }, (r) => { r.resume(); r.on('end', () => resolve(r.statusCode)); }).on('error', reject); });
  assert.equal(await get('demo-field-guide.local.ping-devops.com:7590'), 200);
  assert.equal(await get('evil.example:7590'), 421);
  await new Promise((res) => server.close(res));
  const closed = createServer();
  await new Promise((res) => closed.listen(0, '127.0.0.1', res));
  const p2 = closed.address().port;
  const code = await new Promise((resolve, reject) => { http.get({ port: p2, host: '127.0.0.1', path: '/api/health', headers: { host: 'demo-field-guide.local.ping-devops.com:7590' } }, (r) => { r.resume(); r.on('end', () => resolve(r.statusCode)); }).on('error', reject); });
  assert.equal(code, 421, 'unset = loopback only');
  await new Promise((res) => closed.close(res));
});

test('no inline script: the page loads its scripts as files, and the CSP allows scripts only from this origin', async () => {
  build();
  const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(html), 'every <script> has a src (the CSP blocks inline script)');
  assert.ok(html.includes('src="theme-init.js"') && html.includes('src="theme.js"'));
  const server = createServer();
  const port = await new Promise((res) => server.listen(0, '127.0.0.1', () => res(server.address().port)));
  const fetchPath = (p) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: p }, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: b })); }).on('error', reject);
  });
  try {
    const page = await fetchPath('/');
    const csp = page.headers['content-security-policy'];
    assert.match(csp, /script-src 'self'/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
    for (const f of ['/theme-init.js', '/theme.js']) {
      const r = await fetchPath(f);
      assert.equal(r.status, 200, f);
      assert.match(r.headers['content-type'], /^text\/javascript/);
      assert.ok(r.body.includes('dfg.theme'), `${f} is the theme script`);
    }
  } finally { await new Promise((res) => server.close(res)); }
});

test('GET /api/shelf returns the configured SHELF_URL (trailing slash trimmed), and a POST to it is not 200', async () => {
  const server = createServer({ env: { SHELF_URL: 'https://shelf.example:8443/' } });
  const port = await new Promise((res) => server.listen(0, '127.0.0.1', () => res(server.address().port)));
  const call = (method) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/api/shelf', method }, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => resolve({ status: r.statusCode, body: b })); });
    req.on('error', reject); req.end();
  });
  try {
    const ok = await call('GET');
    assert.equal(ok.status, 200);
    assert.deepEqual(JSON.parse(ok.body), { shelfUrl: 'https://shelf.example:8443' });
    assert.notEqual((await call('POST')).status, 200);
    const page = await new Promise((resolve, reject) => { http.get({ host: '127.0.0.1', port, path: '/' }, (r) => { r.resume(); resolve(r.headers['content-security-policy']); }).on('error', reject); });
    assert.match(page, /connect-src 'self'/, 'the page may fetch /api/shelf');
  } finally { await new Promise((res) => server.close(res)); }
});
