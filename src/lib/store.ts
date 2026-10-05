// ============================================================
// hodi - Store nhỏ cho useSyncExternalStore
//
// Cùng cách với fina/src/lib/prefs.ts: đọc localStorage trong useEffect gây
// hydration mismatch và React 19 cấm setState thẳng trong effect.
// useSyncExternalStore: server dùng giá trị mặc định, client đọc giá trị thật
// ngay sau khi hydrate.
//
// Mọi truy cập storage đều bọc try/catch: Safari private mode ném lỗi.
// ============================================================

type Listener = () => void;

export type Store<T> = {
  subscribe(fn: Listener): () => void;
  get(): T;
  getServer(): T;
  set(next: T): void;
};

/** Giá trị chỉ sống trong RAM (vd: đang gõ hay không). */
export function memoryStore<T>(initial: T): Store<T> {
  const listeners = new Set<Listener>();
  let value = initial;
  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get: () => value,
    getServer: () => initial,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((fn) => fn());
    },
  };
}

/** Chuỗi lưu trong localStorage (theo máy) hoặc sessionStorage (theo phiên). */
export function stringStore<T extends string>(
  key: string,
  fallback: T,
  parse: (raw: string) => T | null,
  kind: 'local' | 'session' = 'local',
): Store<T> {
  const listeners = new Set<Listener>();
  let cache: T | undefined;
  const storage = () => (kind === 'local' ? localStorage : sessionStorage);

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get() {
      if (cache !== undefined) return cache;
      try {
        const raw = storage().getItem(key);
        cache = (raw !== null ? parse(raw) : null) ?? fallback;
      } catch {
        cache = fallback;
      }
      return cache;
    },
    getServer: () => fallback,
    set(next) {
      cache = next;
      try {
        storage().setItem(key, next);
      } catch {
        // bỏ qua
      }
      listeners.forEach((fn) => fn());
    },
  };
}

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // bỏ qua
  }
}

/** Xoá mọi key của hodi (khi sign out). */
export function clearHodiStorage(): void {
  for (const storage of [() => localStorage, () => sessionStorage]) {
    try {
      const s = storage();
      Object.keys(s)
        .filter((k) => k.startsWith('hodi.'))
        .forEach((k) => s.removeItem(k));
    } catch {
      // bỏ qua
    }
  }
}
