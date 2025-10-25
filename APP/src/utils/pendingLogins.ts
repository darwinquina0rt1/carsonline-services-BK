type Pending = { userId: string; email: string; createdAt: number };
const TTL_MS = 5 * 60 * 1000;
const pending = new Map<string, Pending>();

export function savePending(state: string, data: Pending) {
  pending.set(state, data);
  setTimeout(() => pending.delete(state), TTL_MS);
}
export function takePending(state: string) {
  const p = pending.get(state);
  if (p) pending.delete(state);
  return p;
}
