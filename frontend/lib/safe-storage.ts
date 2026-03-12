/**
 * Safe localStorage wrapper that handles Node.js v25+ SSR where
 * `localStorage` exists as a global but its methods are undefined.
 */

function isBrowserStorage(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.document !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function'
    )
  } catch {
    return false
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (!isBrowserStorage()) return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem(key: string, value: string): void {
    if (!isBrowserStorage()) return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // quota exceeded or other error
    }
  },

  removeItem(key: string): void {
    if (!isBrowserStorage()) return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}
