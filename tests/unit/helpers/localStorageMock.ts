// Polyfill mínimo de localStorage para el ambiente node de Vitest.
// Debe estar presente en globalThis antes de importar cualquier store que
// persista en localStorage.
// `Storage` es el tipo del DOM para `localStorage` (TS 5.9 no define
// `LocalStorage`; `window.localStorage` es de tipo `Storage`).
export function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as unknown as Storage;
}

export function installLocalStorage(): void {
  (globalThis as { localStorage: Storage }).localStorage = createLocalStorageMock();
}
