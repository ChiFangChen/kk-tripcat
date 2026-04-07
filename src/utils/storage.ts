import type { User } from '../types'

const PREFIX = 'kk-tripcat-'
const AUTH_KEY = PREFIX + 'auth'

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

export function removeItem(key: string): void {
  localStorage.removeItem(PREFIX + key)
}

export function loadAuth(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.currentUser || null
  } catch {
    return null
  }
}

export function saveAuth(user: User | null): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ currentUser: user }))
}
