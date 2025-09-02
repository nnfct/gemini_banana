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

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, ...opts });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => (code === 0 ? resolve({ code, out, err }) : reject(new Error(err || `exit ${code}`))));
  });
}

async function ensureVenvAndDeps() {
  const venvWin = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
  const venvNix = path.join(backendDir, '.venv', 'bin', 'python');
  const hasWin = await import('node:fs').then(({ existsSync }) => existsSync(venvWin));
  const hasNix = await import('node:fs').then(({ existsSync }) => existsSync(venvNix));
  if (!hasWin && !hasNix) {
    console.log('Creating venv and installing dependencies...');
    await run('python', ['-m', 'venv', '.venv'], { cwd: backendDir });
  }
  const py = hasWin ? venvWin : (hasNix ? venvNix : path.join(backendDir, '.venv', 'Scripts', 'python.exe'));
  await run(py, ['-m', 'pip', 'install', '--upgrade', 'pip'], { cwd: backendDir }).catch(() => {});
  await run(py, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: backendDir });
  return py;
}

async function main() {
  const py = await ensureVenvAndDeps();
  console.log(`Starting FastAPI (uvicorn) on ${port}...`);
  const uv = spawn(py, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', port], {
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
