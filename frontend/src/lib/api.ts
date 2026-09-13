const TOKEN = 'rm_token'

// In production, use VITE_API_URL or the deployed Railway backend.
// In local development, leave empty so Vite proxies /api to localhost:8000.
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://researchmind-production-cdf7.up.railway.app' : '')

export function getToken(): string | null {
  return localStorage.getItem(TOKEN)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN)
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const url = `${API_BASE}${path}`
  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const j = await res.json()
      detail = j.detail || JSON.stringify(j)
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : 'Request failed')
  }
  return res.json() as Promise<T>
}

// Helper for SSE streams — respects API_BASE
export function apiStreamUrl(path: string): string {
  return `${API_BASE}${path}`
}
