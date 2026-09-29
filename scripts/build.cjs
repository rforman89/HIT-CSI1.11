// Shared guarded entrypoint for local, CI and Vercel builds.
(async () => { const { build } = await import('vite'); await build(); })().catch(error => { console.error(error.message); process.exitCode = 1; });
