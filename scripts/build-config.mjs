import { loadEnv } from 'vite';
export const clientKeys = ['REACT_APP_SUPABASE_URL', 'REACT_APP_SUPABASE_ANON_KEY', 'REACT_APP_ENVIRONMENT', 'REACT_APP_TEST_PROJECT_ID', 'REACT_APP_RELEASE'];
export function clientEnvironment(mode, directory = process.cwd(), overrides = process.env) {
  const env = { ...loadEnv(mode, directory, 'REACT_APP_'), ...overrides };
  if (env.VERCEL_ENV === 'production') env.REACT_APP_ENVIRONMENT = 'production';
  env.REACT_APP_RELEASE = env.VERCEL_GIT_COMMIT_SHA || env.CSI_RELEASE || 'local';
  return Object.fromEntries(clientKeys.map(key => [key, env[key] || '']));
}
export function validateBuild(env, hosted = process.env.VERCEL_ENV) {
  const production = 'uhfcrskkgutlqqogahbr', environment = env.REACT_APP_ENVIRONMENT;
  let endpoint;
  try { endpoint = new URL(env.REACT_APP_SUPABASE_URL); } catch { throw new Error('Supabase URL ontbreekt of is ongeldig.'); }
  const expected = env.REACT_APP_TEST_PROJECT_ID, key = env.REACT_APP_SUPABASE_ANON_KEY;
  if (!key) throw new Error('Supabase client key ontbreekt.');
  let role;
  try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role; } catch { /* Publishable keys need no JWT decoding. */ }
  if (key.startsWith('sb_secret_') || role === 'service_role') throw new Error('Server-only key in frontendconfiguratie geweigerd.');
  if (!['production', 'test'].includes(environment)) throw new Error('Applicatieomgeving moet expliciet production of test zijn.');
  if (hosted === 'preview' && environment !== 'test') throw new Error('Preview vereist een geïsoleerde testbackend.');
  if (environment === 'production' && (endpoint.hostname !== `${production}.supabase.co` || endpoint.protocol !== 'https:')) throw new Error('Onverwachte productiebackend.');
  if (environment === 'test' && (!expected || endpoint.hostname.split('.')[0] === production ||
    (['localhost', '127.0.0.1'].includes(endpoint.hostname)
      ? endpoint.protocol !== 'http:' || endpoint.port !== '55421' || expected !== 'csi-hit-reliability'
      : endpoint.hostname !== `${expected}.supabase.co` || endpoint.protocol !== 'https:'))) throw new Error('Testbackend is niet aantoonbaar geïsoleerd.');
  if (hosted && ['localhost', '127.0.0.1'].includes(endpoint.hostname)) throw new Error('Een gehoste deployment kan de lokale testbackend niet gebruiken.');
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/') throw new Error('Supabase URL moet een kale origin zijn.');
}
