import { spawn } from 'node:child_process';
import { once } from 'node:events';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function stopChildProcess(proc) {
  if (!proc || proc.exitCode !== null || proc.killed) return;
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

async function waitForHealthy(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(250);
  }
  throw new Error('Healthcheck timeout');
}

async function runBatch(iterations, concurrency) {
  const latencies = [];
  let errors = 0;

  for (let i = 0; i < iterations; i += concurrency) {
    const jobs = [];
    for (let c = 0; c < concurrency && i + c < iterations; c += 1) {
      const t0 = Date.now();
      jobs.push(
        fetch('http://localhost:4000/api/metrics')
          .then((res) => {
            if (!res.ok) errors += 1;
            return res.text();
          })
          .catch(() => {
            errors += 1;
          })
          .finally(() => {
            latencies.push(Date.now() - t0);
          })
      );
    }
    await Promise.all(jobs);
  }

  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((s, v) => s + v, 0) / Math.max(1, latencies.length);
  const p95 = latencies[Math.max(0, Math.floor(latencies.length * 0.95) - 1)] || 0;
  const max = latencies[latencies.length - 1] || 0;

  return {
    requests: latencies.length,
    errors,
    avgLatencyMs: Number(avg.toFixed(2)),
    p95LatencyMs: Number(p95.toFixed(2)),
    maxLatencyMs: Number(max.toFixed(2))
  };
}

async function main() {
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  try {
    await waitForHealthy('http://localhost:4000/api/health');

    for (let i = 0; i < 30; i += 1) {
      await fetch('http://localhost:4000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `loadtest-task-${Date.now()}-${i}`, priority: 2 })
      });
    }

    const result = await runBatch(240, 24);
    const backpressure = await fetch('http://localhost:4000/api/ops/backpressure').then((r) => r.json());

    console.log('LOADTEST_RESULT', JSON.stringify(result));
    console.log('BACKPRESSURE', JSON.stringify(backpressure));

    if (result.errors > 0) {
      process.exitCode = 1;
    }
  } finally {
    await stopChildProcess(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
