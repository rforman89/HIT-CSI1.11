// One bounded coalescing window, one in-flight background refresh, dirty data retained.
export function createRefreshQueue(run, canRun = () => true, delay = 300) {
  let timer, running = false, disposed = false;
  const dirty = new Set();
  const schedule = () => {
    if (disposed || timer || running || !dirty.size) return;
    timer = setTimeout(async () => {
      timer = null;
      if (!canRun()) { schedule(); return; }
      const tables = dirty.has('*') ? null : [...dirty];
      dirty.clear(); running = true;
      try { await run(tables); }
      finally { running = false; schedule(); }
    }, delay);
  };
  return {
    request(tables = ['*']) { if(disposed)return; tables.forEach(t=>dirty.add(t)); schedule(); },
    clear() { dirty.clear(); clearTimeout(timer); timer = null; },
    dispose() { disposed = true; dirty.clear(); clearTimeout(timer); timer = null; },
  };
}
