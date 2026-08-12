/**
 * Test setup.
 *
 * Node 22+ ships an experimental `globalThis.localStorage` that is
 * `undefined` unless `--localstorage-file` is passed. Vitest's jsdom
 * environment skips copying jsdom's real localStorage onto the global
 * (its `getWindowKeys` drops keys that already exist on the global),
 * which leaves tests with an undefined localStorage.
 *
 * This setup installs a spec-shaped in-memory Storage implementation
 * before any test runs so the local adapter's persistence layer works
 * exactly like it does in a browser.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
  writable: true,
});
