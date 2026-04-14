// In-memory store for demo mode (no Google Drive needed)
// Data persists only while the dev server is running

const store = new Map<string, unknown>();

export const demoStore = {
  get(filename: string): unknown | null {
    return store.get(filename) ?? null;
  },
  set(filename: string, data: unknown): void {
    store.set(filename, data);
  },
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of store) {
      // Normalise key: remove .enc/.json, replace _meta with _meta
      const name = key.replace(".enc", "").replace(".json", "");
      result[name] = value;
    }
    return result;
  },
  delete(filename: string): void {
    store.delete(filename);
  },
  clear(): void {
    store.clear();
  },
};
