// Fail closed before producing a deployable bundle. Never infer a test backend.
process.env.NODE_ENV = 'production';
require('react-scripts/config/env');
const { spawnSync } = require('node:child_process');
const production = 'uhfcrskkgutlqqogahbr';
if (process.env.VERCEL_ENV === 'production') process.env.REACT_APP_ENVIRONMENT = 'production';
const environment = process.env.REACT_APP_ENVIRONMENT;
let endpoint;
try { endpoint = new URL(process.env.REACT_APP_SUPABASE_URL); } catch { throw new Error('Supabase URL ontbreekt of is ongeldig.'); }
const project = endpoint.hostname.split('.')[0];
const expected = process.env.REACT_APP_TEST_PROJECT_ID;
if (!process.env.REACT_APP_SUPABASE_ANON_KEY) throw new Error('Supabase client key ontbreekt.');
if (!['production', 'test'].includes(environment)) throw new Error('Applicatieomgeving moet expliciet production of test zijn.');
if (process.env.VERCEL_ENV === 'preview' && environment !== 'test') throw new Error('Preview vereist een geïsoleerde testbackend.');
if (environment === 'production' && (endpoint.hostname !== `${production}.supabase.co` || endpoint.protocol !== 'https:')) throw new Error('Onverwachte productiebackend.');
if (environment === 'test' && (!expected || project === production ||
    (['localhost', '127.0.0.1'].includes(endpoint.hostname)
      ? endpoint.port !== '55421' || expected !== 'csi-hit-reliability'
      : endpoint.hostname !== `${expected}.supabase.co` || endpoint.protocol !== 'https:'))) throw new Error('Testbackend is niet aantoonbaar geïsoleerd.');
if (process.env.VERCEL_ENV && ['localhost', '127.0.0.1'].includes(endpoint.hostname)) throw new Error('Een gehoste deployment kan de lokale testbackend niet gebruiken.');
const result = spawnSync(process.execPath, [require.resolve('react-scripts/scripts/build')], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
