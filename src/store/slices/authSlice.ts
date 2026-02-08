// Auth 状态管理
import { StateCreator } from 'zustand'

export interface GitHubUser {
  id: number
  login: string
  avatar_url: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: GitHubUser | null
  token: string | null
  expiresAt: number | null
}

export interface AuthSlice {
  auth: AuthState
  authLoading: boolean
  setAuth: (auth: AuthState) => void
  setAuthLoading: (loading: boolean) => void
  login: () => void
  logout: () => void
  restoreAuth: () => Promise<void>
  handleAuthCallback: () => Promise<void>
}

const AUTH_STORAGE_KEY = 'nano_auth'
const AUTH_API_BASE = '/api/auth'

const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  expiresAt: null
}

interface StoredAuthData {
  token: string
  user: GitHubUser
  expiresAt: number
}

function getStoredAuth(): StoredAuthData | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as StoredAuthData
  } catch {
    return null
  }
}

function setStoredAuth(data: StoredAuthData): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return true
  return Date.now() >= expiresAt
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set, _get) => ({
  auth: initialAuthState,
  authLoading: true,

  setAuth: (auth) => set({ auth }),
  setAuthLoading: (authLoading) => set({ authLoading }),

  login: () => {
    window.location.href = `${AUTH_API_BASE}/github`
  },

  logout: () => {
    clearStoredAuth()
    set({ auth: initialAuthState })
  },

  restoreAuth: async () => {
    const stored = getStoredAuth()

    if (stored && !isTokenExpired(stored.expiresAt)) {
      try {
        const response = await fetch(`${AUTH_API_BASE}/user`, {
          headers: {
            'Authorization': `Bearer ${stored.token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          const userData = data.user || data
          set({
            auth: {
              isAuthenticated: true,
              user: userData,
              token: stored.token,
              expiresAt: stored.expiresAt
            }
          })
          setStoredAuth({
            token: stored.token,
            user: userData,
            expiresAt: stored.expiresAt
          })
        } else {
          clearStoredAuth()
        }
      } catch {
        // 网络错误，使用缓存数据
        set({
          auth: {
            isAuthenticated: true,
            user: stored.user,
            token: stored.token,
            expiresAt: stored.expiresAt
          }
        })
      }
    } else if (stored) {
      clearStoredAuth()
    }

    set({ authLoading: false })
  },

  handleAuthCallback: async () => {
    const hash = window.location.hash
    const authMatch = hash.match(/[#&]auth\?token=([^&]+)/)

    if (authMatch) {
      const token = authMatch[1]
      set({ authLoading: true })

      try {
        const response = await fetch(`${AUTH_API_BASE}/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          const userData = data.user || data
          const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天

          setStoredAuth({
            token,
            user: userData,
            expiresAt
          })

          set({
            auth: {
              isAuthenticated: true,
              user: userData,
              token,
              expiresAt
            }
          })
        }
      } catch (error) {
        console.error('Auth callback error:', error)
      }

      // 清除 URL 中的 auth token（完全移除 hash，不留空 #）
      history.replaceState(null, '', window.location.pathname + window.location.search)
      set({ authLoading: false })
    }
  }
})
