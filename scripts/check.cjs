const { spawnSync } = require('node:child_process');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const npm = process.env.npm_execpath;
if (!npm) throw Error('Run this gate with npm run check');
const run = (args, env = process.env) => {
  const result = spawnSync(process.execPath, [npm, ...args], { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status || 1);
};
for (const script of ['lint', 'test', 'security:scan']) run(['run', script]);
const diff = spawnSync('git', ['diff', '--check'], { stdio: 'inherit' });
if (diff.status !== 0) process.exit(diff.status || 1);
// Offline build proof: no backend, credentials or developer .env required.
const env = { ...process.env, VERCEL_ENV: '', VERCEL_GIT_COMMIT_SHA: '', CSI_RELEASE: 'local-check',
  REACT_APP_ENVIRONMENT: 'test', REACT_APP_TEST_PROJECT_ID: 'csi-hit-reliability',
  REACT_APP_SUPABASE_URL: 'http://127.0.0.1:55421', REACT_APP_SUPABASE_ANON_KEY: 'offline-public-placeholder',
  SUPABASE_SERVICE_ROLE_KEY: 'CSI_SERVER_SECRET_SENTINEL', CRON_SECRET: 'CSI_SERVER_SECRET_SENTINEL',
  REACT_APP_UNUSED_SECRET: 'CSI_SERVER_SECRET_SENTINEL', VITE_SECRET: 'CSI_SERVER_SECRET_SENTINEL' };
run(['run', 'build'], env);
const bundle = spawnSync(process.execPath, ['scripts/bundle-check.cjs'], { stdio: 'inherit' });
if (bundle.status !== 0) process.exit(bundle.status || 1);
console.log('Local quality gate passed (offline build; not a deployment artifact).');
