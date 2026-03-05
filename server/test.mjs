import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function stopChildProcess(proc) {
  if (proc.exitCode !== null || proc.killed) return;

  proc.kill('SIGTERM');
  const exited = await Promise.race([
    once(proc, 'exit').then(() => true),
    sleep(1500).then(() => false)
  ]);

  if (!exited && proc.exitCode === null && !proc.killed) {
    proc.kill('SIGKILL');
    await once(proc, 'exit');
  }
}

async function waitForHealthy({ url, timeoutMs = 30000, intervalMs = 500 }) {
  const started = Date.now();
  let lastError;

  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = new Error(`Healthcheck failed: ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(intervalMs);
  }

  throw lastError || new Error('Healthcheck timed out');
}

async function run() {
  try {
    await waitForHealthy({ url: 'http://localhost:4000/api/health' });

    const tasks = await fetch('http://localhost:4000/api/tasks');
    assert.equal(tasks.status, 200);
    const data = await tasks.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 1);
  } finally {
    await stopChildProcess(child);
  }
}

async function main() {
  try {
    await run();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

main();
