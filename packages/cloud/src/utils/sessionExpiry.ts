// The current BFF token is payload.signature (not a three-part JWT).
// Reading exp only bounds the local cache; server verification remains authoritative.
export function sessionExpiry(token: string | null, cachedExpiry: number): number | null {
  if (!token || !Number.isFinite(cachedExpiry)) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return null;
    const payload = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    if (!Number.isSafeInteger(payload.exp) || payload.exp <= 0) return null;
    return Math.min(cachedExpiry, payload.exp * 1000);
  } catch {
    return null;
  }
}
