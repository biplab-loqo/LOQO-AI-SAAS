/**
 * Next.js Instrumentation hook
 * Runs once when the Next.js server starts.
 * Patches Node.js v25+ broken localStorage global.
 */
export async function register() {
  if (
    typeof globalThis.localStorage !== 'undefined' &&
    typeof globalThis.localStorage.getItem !== 'function'
  ) {
    // Node.js v25 provides a localStorage object without Web Storage API methods.
    // Replace it entirely with a Map-backed implementation.
    const store = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, String(value)) },
      removeItem: (key: string) => { store.delete(key) },
      clear: () => { store.clear() },
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() { return store.size },
    } as Storage
  }
}
