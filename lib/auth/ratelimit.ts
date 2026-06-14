interface Attempt {
  count:     number
  firstSeen: number
  blocked:   boolean
}

const store = new Map<string, Attempt>()

const WINDOW_MS    = 15 * 60 * 1000  // 15 minuti
const MAX_ATTEMPTS = 5                // tentativi massimi per finestra

export function checkRateLimit(key: string): { allowed: boolean; remainingMs?: number } {
  const now  = Date.now()
  const entry = store.get(key)

  if (!entry) {
    store.set(key, { count: 1, firstSeen: now, blocked: false })
    return { allowed: true }
  }

  // Reset finestra scaduta
  if (now - entry.firstSeen > WINDOW_MS) {
    store.set(key, { count: 1, firstSeen: now, blocked: false })
    return { allowed: true }
  }

  if (entry.blocked) {
    const remainingMs = WINDOW_MS - (now - entry.firstSeen)
    return { allowed: false, remainingMs }
  }

  entry.count++

  if (entry.count > MAX_ATTEMPTS) {
    entry.blocked = true
    const remainingMs = WINDOW_MS - (now - entry.firstSeen)
    return { allowed: false, remainingMs }
  }

  return { allowed: true }
}

export function resetRateLimit(key: string) {
  store.delete(key)
}

// Pulizia periodica per evitare memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now - entry.firstSeen > WINDOW_MS) store.delete(key)
  }
}, WINDOW_MS)