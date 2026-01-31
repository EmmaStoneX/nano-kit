// GitHub OAuth - 重定向到 GitHub 授权页面

interface Env {
  AUTH_TOKENS: KVNamespace
}

const GITHUB_CLIENT_ID = 'Ov23litrUqwRskSTFzHc'
const GITHUB_REDIRECT_URI = 'https://nano-kit.zxvmax.com/api/auth/callback'
const GITHUB_SCOPE = 'read:user'

// 生成安全随机 state
function generateState(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(32)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < 32; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.AUTH_TOKENS) {
      return new Response(JSON.stringify({ error: 'Auth service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const state = generateState()

    // 存储 state 用于验证回调 (5分钟过期)
    await context.env.AUTH_TOKENS.put(`state:${state}`, 'valid', { expirationTtl: 300 })

    const authUrl = new URL('https://github.com/login/oauth/authorize')
    authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI)
    authUrl.searchParams.set('scope', GITHUB_SCOPE)
    authUrl.searchParams.set('state', state)

    return Response.redirect(authUrl.toString(), 302)
  } catch (error: any) {
    console.error('[Auth GitHub] Error:', error)
    return new Response(JSON.stringify({ error: 'Auth initialization failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
