// Stable keyset traversal, with explicit completeness under an API row cap.
export async function readAllRows(makeQuery, signal, key = 'id', pageSize = 250) {
  const result = [];
  let cursor, expected;
  for (let page = 0; page < 200; page++) {
    let query = makeQuery(page === 0).order(key, { ascending: true }).limit(pageSize);
    if (cursor !== undefined) query = query.gt(key, cursor);
    const { data, error, count } = await query.abortSignal(signal);
    if (error) throw new Error(error.message || 'Gegevens ophalen mislukt.');
    if (!Array.isArray(data)) throw new Error('Ongeldige gegevensrespons.');
    if (page === 0) expected = count;
    if (!data.length) return result;
    const last = data[data.length - 1][key];
    if (last == null || (cursor !== undefined && last <= cursor)) throw new Error('Paginering kon niet veilig worden vervolgd.');
    result.push(...data); cursor = last;
    if (data.length < pageSize && (expected == null || result.length >= expected)) return result;
  }
  throw new Error('Dataset te groot om volledig te laden. Neem contact op met de organisatie.');
}
