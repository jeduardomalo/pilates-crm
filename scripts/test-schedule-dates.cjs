const { spawnSync } = require('node:child_process');
for (const timezone of ['UTC', 'America/New_York', 'America/Los_Angeles', 'America/Mexico_City', 'Asia/Tokyo']) {
  console.log(`Testing schedule dates in ${timezone}`);
  const result = spawnSync(process.execPath, ['-r', 'ts-node/register', '--test', 'tests/schedule-dates.test.cjs'], {
    stdio: 'inherit',
    env: { ...process.env, TZ: timezone, TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'commonjs', moduleResolution: 'node' }) },
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
