import { StateCreator } from 'zustand'
import { getDeviceId } from '../../services/r2Storage'

export interface UsageState {
  remaining: number
  total: number
  isLimited: boolean
  isAuthenticated: boolean
  resetTime: string
}

export interface UsageSlice {
  usage: UsageState
  usageLoading: boolean
  refreshUsage: () => Promise<void>
  decrementUsage: () => void
  checkAndIncrementUsage: () => Promise<{ allowed: boolean; remaining: number }>
}

const USAGE_API = '/api/usage'
const DEFAULT_TOTAL = 5

const initialUsageState: UsageState = {
  remaining: DEFAULT_TOTAL,
  total: DEFAULT_TOTAL,
  isLimited: false,
  isAuthenticated: false,
  resetTime: ''
}

export const createUsageSlice: StateCreator<
  UsageSlice & { auth: { isAuthenticated: boolean; token: string | null } },
  [],
  [],
  UsageSlice
> = (set, get) => ({
  usage: initialUsageState,
  usageLoading: false,

  refreshUsage: async () => {
    const { auth } = get()

    // 登录用户无限制
    if (auth.isAuthenticated) {
      set({
        usage: {
          remaining: Infinity,
          total: Infinity,
          isLimited: false,
          isAuthenticated: true,
          resetTime: ''
        }
      })
      return
    }

    set({ usageLoading: true })
    try {
      const headers: Record<string, string> = {}
      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`
      }

      const deviceId = getDeviceId()
      const response = await fetch(`${USAGE_API}?deviceId=${deviceId}`, { headers })
      if (response.ok) {
        const data = await response.json()
        set({
          usage: {
            remaining: data.remaining ?? DEFAULT_TOTAL,
            total: data.total ?? DEFAULT_TOTAL,
            isLimited: (data.remaining ?? DEFAULT_TOTAL) <= 0,
            isAuthenticated: data.isAuthenticated ?? false,
            resetTime: data.resetTime ?? ''
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    } finally {
      set({ usageLoading: false })
    }
  },

  decrementUsage: () => {
    const { auth, usage } = get()
    if (auth.isAuthenticated) return

    set({
      usage: {
        ...usage,
        remaining: Math.max(0, usage.remaining - 1),
        isLimited: usage.remaining - 1 <= 0
      }
    })
  },

  checkAndIncrementUsage: async () => {
    const { auth } = get()

    // 登录用户无限制
    if (auth.isAuthenticated) {
      return { allowed: true, remaining: Infinity }
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`
      }

      const deviceId = getDeviceId()
      const response = await fetch(USAGE_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({ deviceId })
      })

      const data = await response.json()

      if (response.status === 429) {
        set({
          usage: {
            ...get().usage,
            remaining: 0,
            isLimited: true
          }
        })
        return { allowed: false, remaining: 0 }
      }

      if (response.ok) {
        const remaining = data.remaining ?? get().usage.remaining - 1
        set({
          usage: {
            ...get().usage,
            remaining: Math.max(0, remaining),
            isLimited: remaining <= 0
          }
        })
        return { allowed: true, remaining }
      }

      return { allowed: true, remaining: get().usage.remaining }
    } catch (error) {
      console.error('Failed to check usage:', error)
      return { allowed: true, remaining: get().usage.remaining }
    }
  }
})
