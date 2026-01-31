// 使用次数限制 API

interface Env {
  AUTH_TOKENS: KVNamespace
  USAGE_LIMIT: KVNamespace
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

const FREE_LIMIT = 5

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders })
}

// GET - 获取当前使用情况
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // 检查是否登录
    const authHeader = context.request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token && context.env.AUTH_TOKENS) {
      const userData = await context.env.AUTH_TOKENS.get(`token:${token}`, 'json') as any
      if (userData && userData.expires_at > Date.now()) {
        // 登录用户无限制
        return new Response(JSON.stringify({
          remaining: Infinity,
          total: Infinity,
          isLimited: false,
          isAuthenticated: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 未登录用户，检查 IP 使用次数
    if (!context.env.USAGE_LIMIT) {
      return new Response(JSON.stringify({
        remaining: FREE_LIMIT,
        total: FREE_LIMIT,
        isLimited: false,
        isAuthenticated: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
    const date = new Date().toISOString().split('T')[0]
    const key = `ip:${ip}:${date}`

    const usage = await context.env.USAGE_LIMIT.get(key, 'json') as { count: number } | null
    const count = usage?.count || 0
    const remaining = Math.max(0, FREE_LIMIT - count)

    return new Response(JSON.stringify({
      remaining,
      total: FREE_LIMIT,
      isLimited: remaining <= 0,
      isAuthenticated: false,
      resetTime: getNextResetTime()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('[Usage] Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to get usage' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// POST - 增加使用次数（生成图片时调用）
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    // 检查是否登录
    const authHeader = context.request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token && context.env.AUTH_TOKENS) {
      const userData = await context.env.AUTH_TOKENS.get(`token:${token}`, 'json') as any
      if (userData && userData.expires_at > Date.now()) {
        // 登录用户无限制
        return new Response(JSON.stringify({ success: true, isAuthenticated: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 未登录用户，检查并增加使用次数
    if (!context.env.USAGE_LIMIT) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
    const date = new Date().toISOString().split('T')[0]
    const key = `ip:${ip}:${date}`

    const usage = await context.env.USAGE_LIMIT.get(key, 'json') as { count: number } | null
    const count = usage?.count || 0

    if (count >= FREE_LIMIT) {
      return new Response(JSON.stringify({
        error: 'Usage limit exceeded',
        code: 'LIMIT_EXCEEDED',
        remaining: 0
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 增加使用次数
    await context.env.USAGE_LIMIT.put(key, JSON.stringify({ count: count + 1 }), {
      expirationTtl: 86400 // 24小时过期
    })

    return new Response(JSON.stringify({
      success: true,
      remaining: FREE_LIMIT - count - 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('[Usage] Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to update usage' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

function getNextResetTime(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}
