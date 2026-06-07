
const TOKEN_KEY = 'sop_access_token'
const REFRESH_KEY = 'sop_refresh_token'
const USER_KEY  = 'sop_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function setStoredUser<T>(user: T): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function isTokenPresent(): boolean {
  return !!getToken()
}
