import "@testing-library/jest-dom";

if (!globalThis.localStorage || typeof globalThis.localStorage.clear !== "function") {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    configurable: true,
  });
}
