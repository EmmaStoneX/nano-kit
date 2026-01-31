// 获取当前登录用户信息

interface Env {
  AUTH_TOKENS: KVNamespace
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders })
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!context.env.AUTH_TOKENS) {
      return new Response(JSON.stringify({ error: 'Auth service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userData = await context.env.AUTH_TOKENS.get(`token:${token}`, 'json') as any

    if (!userData) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (userData.expires_at < Date.now()) {
      await context.env.AUTH_TOKENS.delete(`token:${token}`)
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      user: {
        id: userData.github_id,
        login: userData.login,
        avatar_url: userData.avatar_url
      },
      expires_at: userData.expires_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('[Auth User] Error:', error)
    return new Response(JSON.stringify({ error: 'Auth check failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
