import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { clientEnvironment, validateBuild } from './scripts/build-config.mjs';
export default defineConfig(({ mode }) => {
  const client = clientEnvironment(mode);
  if (mode !== 'test') validateBuild(client);
  return {
    plugins: [react(), { name: 'csi-build-metadata', generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build-meta.json', source: JSON.stringify({
        release: client.REACT_APP_RELEASE.replace(/[^a-zA-Z0-9._-]/g, '').slice(0,64),
        environment: client.REACT_APP_ENVIRONMENT, tool: 'vite', node: process.versions.node,
      }) + '\n' });
    } }],
    // Preserve public env names, exposing only this explicit allowlist.
    envPrefix: [],
    define: Object.fromEntries(Object.entries(client).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])),
    server: { host: '127.0.0.1' },
    build: { outDir: 'build', sourcemap: false, target: ['chrome107', 'safari16', 'firefox104'], chunkSizeWarningLimit: 750 },
    test: { globals: true, environment: 'jsdom', include: ['src/**/*.test.js'] },
  };
});
