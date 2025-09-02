// ESM script: ensure venv, run uvicorn in dev mode
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const backendDir = path.join(process.cwd(), 'backend_py');
const port = process.env.PY_PORT || '3001';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', windowsHide: true, ...opts });
    p.on('close', (code) => (code === 0 ? resolve(code) : reject(new Error(`exit ${code}`))));
  });
}

async function ensureVenv() {
  const venvWin = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
  const venvNix = path.join(backendDir, '.venv', 'bin', 'python');
  const hasWin = existsSync(venvWin);
  const hasNix = existsSync(venvNix);
  if (!hasWin && !hasNix) {
    console.log('[py] creating venv...');
    await run('python', ['-m', 'venv', '.venv'], { cwd: backendDir });
  }
  const py = hasWin ? venvWin : (hasNix ? venvNix : path.join(backendDir, '.venv', 'Scripts', 'python.exe'));
  console.log('[py] installing deps...');
  try { await run(py, ['-m', 'pip', 'install', '--upgrade', 'pip'], { cwd: backendDir }); } catch {}
  await run(py, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: backendDir });
  return py;
}

async function main() {
  const py = await ensureVenv();
  console.log(`[py] starting uvicorn on ${port}...`);
  await run(py, ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', port], { cwd: backendDir });
}

main().catch((e) => { console.error(e); process.exit(1); });

