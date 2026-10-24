export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (typeof navigator === 'undefined') return null
    const storage = navigator.storage
    if (!storage || typeof storage.persist !== 'function') return null
    if (typeof storage.persisted === 'function' && (await storage.persisted())) return true
    return await storage.persist()
  } catch {
    return null
  }
}
