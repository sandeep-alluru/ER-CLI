// Persistent key/value storage.
//
// Use SDK storage to preserve device state across app exits in Even Hub.
// Browser localStorage is the fallback for desktop use.

interface Kv {
  get(key: string): Promise<string>
  set(key: string, value: string): Promise<void>
  del(key: string): Promise<void>
}

interface StorageBridge {
  setLocalStorage(key: string, value: string): Promise<boolean>
  getLocalStorage(key: string): Promise<string>
}

const browserKv: Kv = {
  async get(key) {
    try {
      return localStorage.getItem(key) ?? ''
    } catch {
      return ''
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* private mode / storage disabled — treat as unpaired rather than throw */
    }
  },
  async del(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* nothing to do */
    }
  },
}

const sdkKv = (bridge: StorageBridge): Kv => ({
  async get(key) {
    try {
      return (await bridge.getLocalStorage(key)) ?? ''
    } catch {
      return ''
    }
  },
  async set(key, value) {
    await bridge.setLocalStorage(key, value)
  },
  // The SDK has no delete — an empty value is the tombstone, and every read
  // path already treats '' as absent.
  async del(key) {
    await bridge.setLocalStorage(key, '')
  },
})

let impl: Kv = browserKv

export function initStore(bridge: unknown): void {
  const b = bridge as Partial<StorageBridge>
  if (typeof b?.setLocalStorage === 'function' && typeof b?.getLocalStorage === 'function') {
    impl = sdkKv(b as StorageBridge)
  }
}

export const storeGet = (key: string): Promise<string> => impl.get(key)
export const storeSet = (key: string, value: string): Promise<void> => impl.set(key, value)
export const storeDel = (key: string): Promise<void> => impl.del(key)
