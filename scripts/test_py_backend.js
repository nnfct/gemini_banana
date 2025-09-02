// ESM script (root package.json has type: module)
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import process from 'node:process';

const backendDir = path.join(process.cwd(), 'backend_py');
const port = process.env.PY_PORT || '3002';

async function waitFor(url, tries = 40, ms = 250) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch {}
    await delay(ms);
  }
  return false;
}

async function main() {
  console.log(`Starting FastAPI (uvicorn) on ${port}...`);
  const uv = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', port], {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  uv.stdout.on('data', (d) => process.stdout.write(`[uvicorn] ${d}`));
  uv.stderr.on('data', (d) => process.stderr.write(`[uvicorn-err] ${d}`));

  const ready = await waitFor(`http://127.0.0.1:${port}/health`, 60, 250);
  if (!ready) {
    uv.kill('SIGKILL');
    throw new Error('Server did not become ready');
  }

  const getJson = async (url, init) => {
    const res = await fetch(url, init);
    return await res.json();
  };

  const base = `http://127.0.0.1:${port}`;
  console.log('GET /health');
  const health = await getJson(`${base}/health`);
  console.log(health);

  console.log('GET /api');
  const api = await getJson(`${base}/api`);
  console.log(api);

  console.log('GET /api/recommend/status');
  const status = await getJson(`${base}/api/recommend/status`);
  console.log(status);

  console.log('GET /api/recommend/catalog');
  const stats = await getJson(`${base}/api/recommend/catalog`);
  console.log(stats);

  console.log('POST /api/recommend');
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
  const recReq = {
    person: { base64: png, mimeType: 'image/png' },
    clothingItems: { top: { base64: png, mimeType: 'image/png' } },
    options: { maxPerCategory: 2, minPrice: 0, maxPrice: 999999 }
  };
  const rec = await getJson(`${base}/api/recommend`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(recReq) });
  console.log(rec);

  uv.kill('SIGTERM');
}

main().catch((err) => {
  console.error('[smoke] failed:', err);
  process.exit(1);
});

