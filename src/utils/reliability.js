export const PRODUCTION_PROJECT = "uhfcrskkgutlqqogahbr";

export function validateBackend({ url, key, environment, expectedProject }) {
  if (!url || !key) throw new Error("Supabase-configuratie ontbreekt.");
  const endpoint = new URL(url);
  const project = endpoint.hostname.split(".")[0];
  const local = ["127.0.0.1", "localhost"].includes(endpoint.hostname);
  if (!["production", "test"].includes(environment)) {
    throw new Error("Kies expliciet production of test als applicatieomgeving.");
  }
  if (environment === "test" && (!expectedProject || project === PRODUCTION_PROJECT ||
      (local && (endpoint.port !== "55421" || expectedProject !== "csi-hit-reliability")) ||
      (!local && (endpoint.hostname !== `${expectedProject}.supabase.co` || endpoint.protocol !== "https:")))) {
    throw new Error("Testomgeving geblokkeerd: backend is niet aantoonbaar geïsoleerd.");
  }
  if (environment === "production" && (endpoint.hostname !== `${PRODUCTION_PROJECT}.supabase.co` || endpoint.protocol !== "https:")) {
    throw new Error("Productiebackend komt niet overeen met de verwachte omgeving.");
  }
  return { url, key, environment, project: local ? expectedProject : project };
}

export function createRequestGate() {
  let generation = 0;
  let controller;
  return {
    invalidate() { generation += 1; controller?.abort(); },
    begin() {
      controller?.abort();
      controller = new AbortController();
      const active = ++generation;
      const currentController = controller;
      return { signal: currentController.signal, abort: () => currentController.abort(), isCurrent: () => active === generation };
    },
  };
}

export function purchaseTimestamp(purchase) {
  return purchase.released_at || purchase.requested_at || purchase.purchased_at || purchase.created_at || null;
}

export function creditStorageKey(project, actor) {
  return `csi-hit:pending-credit:${project}:${actor}`;
}

export function readPendingCredit(storage, key) {
  const value = storage.getItem(key);
  if (!value) return null;
  const pending = JSON.parse(value);
  if (!pending.action_id || !pending.target_group_id || !Number.isInteger(pending.amount_change)) {
    throw new Error("Opgeslagen pegelactie is ongeldig. Laat de organisatie de actie-ID controleren.");
  }
  return pending;
}

// Persist BEFORE sending. An unknown outcome survives reload and retries with the same ID.
export async function mutateCredits({ client, storage, storageKey, groupId, amount, reason, onPending }) {
  let pending = readPendingCredit(storage, storageKey);
  if (!pending) {
    if (!groupId || !Number.isInteger(amount) || amount === 0 || !reason?.trim()) {
      throw new Error("Kies een groep, een geheel aantal pegels (niet nul) en een reden.");
    }
    pending = { action_id: crypto.randomUUID(), target_group_id: groupId,
      amount_change: amount, mutation_reason: reason.trim() };
    storage.setItem(storageKey, JSON.stringify(pending));
  }
  onPending(pending);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response;
    try { response = await client.rpc("mutate_group_credits", pending).abortSignal(controller.signal); }
    finally { clearTimeout(timeout); }
    if (response.error) {
      // A PostgreSQL error response means this transaction rolled back.
      if (/^[0-9A-Z]{5}$/.test(response.error.code || "") && response.status < 500) {
        storage.removeItem(storageKey);
        onPending(null);
        throw new Error(response.error.message);
      }
      throw new Error("unknown-outcome");
    }
    if (response.data?.action_id !== pending.action_id) throw new Error("unknown-outcome");
    storage.removeItem(storageKey);
    onPending(null);
    return response.data;
  } catch (error) {
    if (storage.getItem(storageKey)) {
      throw new Error("Uitkomst nog onbekend. Controleer/herhaal de opgeslagen pegelactie; dezelfde actie-ID voorkomt dubbel boeken.");
    }
    throw error;
  }
}
