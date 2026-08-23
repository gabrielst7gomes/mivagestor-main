type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "clear">;

function createMemoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => (data.has(key) ? data.get(key)! : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
  };
}

try {
  const testKey = "__miva_storage_test__";
  window.localStorage.setItem(testKey, "1");
  window.localStorage.removeItem(testKey);
} catch {
  Object.defineProperty(window, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
  });
}