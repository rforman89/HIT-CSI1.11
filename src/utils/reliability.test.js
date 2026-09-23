import { validateBackend, createRequestGate, purchaseTimestamp, mutateCredits, readPendingCredit, creditStorageKey } from './reliability';
import { loadAppSnapshot } from '../services/loadAppSnapshot';
const id = '11111111-1111-4111-8111-111111111111';
beforeEach(() => { sessionStorage.clear(); Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => id } }); });
const config = { url: 'http://127.0.0.1:55421', key: 'test', environment: 'test', expectedProject: 'csi-hit-reliability' };
test('explicit isolated local environment allowed', () => expect(validateBackend(config).environment).toBe('test'));
test('test refuses production even if expected project is production', () => expect(() => validateBackend({ ...config, url: 'https://uhfcrskkgutlqqogahbr.supabase.co', expectedProject: 'uhfcrskkgutlqqogahbr' })).toThrow());
test('unknown environment, missing key and mismatched project blocked', () => {
  for (const override of [{ environment: undefined }, { key: '' }, { url: 'https://other.supabase.co' }]) expect(() => validateBackend({ ...config, ...override })).toThrow();
});
test('older request cannot overwrite latest snapshot', () => { const gate = createRequestGate(), old = gate.begin(), current = gate.begin(); expect(old.signal.aborted).toBe(true); expect(old.isCurrent()).toBe(false); expect(current.isCurrent()).toBe(true); });
test('logout invalidates in-flight request', () => { const gate = createRequestGate(), request = gate.begin(); gate.invalidate(); expect(request.isCurrent()).toBe(false); expect(request.signal.aborted).toBe(true); });
test('timestamp uses persisted release/request fields', () => { expect(purchaseTimestamp({ requested_at: 'request', released_at: 'release', purchased_at: 'legacy' })).toBe('release'); expect(purchaseTimestamp({ requested_at: 'request' })).toBe('request'); expect(purchaseTimestamp({})).toBeNull(); });
test('pending credit namespace isolates account and backend', () => { expect(creditStorageKey('local', 'A')).not.toBe(creditStorageKey('local', 'B')); expect(creditStorageKey('local', 'A')).not.toBe(creditStorageKey('other', 'A')); });
const params = client => ({ client, storage: sessionStorage, storageKey: 'pending', groupId: 'group', amount: 5, reason: 'Test', onPending: jest.fn() });
const mock = response => ({ rpc: jest.fn(() => ({ abortSignal: () => Promise.resolve(response) })) });
test('successful mutation persists before send and clears after acknowledgement', async () => {
  const client = mock({ data: { action_id: id } }); client.rpc.mockImplementation((_, payload) => { expect(readPendingCredit(sessionStorage, 'pending')).toEqual(payload); return { abortSignal: () => Promise.resolve({ data: { action_id: id } }) }; });
  await mutateCredits(params(client)); expect(sessionStorage.getItem('pending')).toBeNull();
});
test('lost response preserves key across reload; retry sends original payload', async () => {
  await expect(mutateCredits(params(mock({ error: { message: 'network' }, status: 0 })))).rejects.toThrow('Uitkomst nog onbekend');
  const saved = readPendingCredit(sessionStorage, 'pending'), client = mock({ data: { action_id: id, replayed: true } });
  await mutateCredits({ ...params(client), groupId: 'other', amount: 99 }); expect(client.rpc.mock.calls[0][1]).toEqual(saved); expect(sessionStorage.getItem('pending')).toBeNull();
});
test('definitive SQL rejection clears pending action', async () => {
  await expect(mutateCredits(params(mock({ error: { code: '22023', message: 'Saldo' }, status: 400 })))).rejects.toThrow('Saldo'); expect(sessionStorage.getItem('pending')).toBeNull();
});
test('unrecognized response keeps action unresolved', async () => { await expect(mutateCredits(params(mock({ data: {} })))).rejects.toThrow('Uitkomst nog onbekend'); expect(readPendingCredit(sessionStorage, 'pending').action_id).toBe(id); });
test('corrupt persisted action cannot silently create another mutation', async () => { sessionStorage.setItem('pending', '{}'); const client = mock({}); await expect(mutateCredits(params(client))).rejects.toThrow('ongeldig'); expect(client.rpc).not.toHaveBeenCalled(); });
function snapshotClient(failure, settings = [{ key: 'game_mode', value: 'test' }]) {
  return { from: table => {
    const builder = { select: () => builder, eq: () => builder, single: () => builder, order: () => builder,
      abortSignal: async () => table === failure ? { error: { message: 'Verbinding verbroken' } } : { data: table === 'profiles' ? { id: 'a', role: 'participant' } : table === 'app_settings' ? settings : [] } };
    return builder;
  } };
}
test('required snapshot query error rejects entire snapshot', async () => { await expect(loadAppSnapshot(snapshotClient('clues'), 'a')).rejects.toThrow('Verbinding verbroken'); });
test('settings failure is not interpreted as TEST', async () => { await expect(loadAppSnapshot(snapshotClient('app_settings'), 'a')).rejects.toThrow(); });
test('missing or invalid mode is unknown while legitimate empty arrays remain valid', async () => {
  for (const settings of [[], [{ key: 'game_mode', value: 'broken' }]]) { const result = await loadAppSnapshot(snapshotClient(null, settings), 'a'); expect(result.gameMode).toBe('unknown'); expect(result.groups).toEqual([]); }
});
