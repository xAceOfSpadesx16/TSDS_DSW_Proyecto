// Polyfill mínimo de localStorage para el ambiente node de Vitest.
// Debe estar presente en globalThis antes de importar cualquier store que
// persista en localStorage.
export function createLocalStorageMock(): LocalStorage {
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
  } as unknown as LocalStorage;
}

export function installLocalStorage(): void {
  (globalThis as { localStorage: LocalStorage }).localStorage = createLocalStorageMock();
}
