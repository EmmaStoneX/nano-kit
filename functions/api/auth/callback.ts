// GitHub OAuth 回调处理

interface Env {
  AUTH_TOKENS: KVNamespace
  GITHUB_CLIENT_SECRET: string
}

const GITHUB_CLIENT_ID = 'Ov23litrUqwRskSTFzHc'

// 生成内部 token
function generateToken(): string {
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
  const requestUrl = new URL(context.request.url)
  const baseUrl = 'https://nano-kit.zxvmax.com'

  try {
    if (!context.env.AUTH_TOKENS) {
      console.error('[Auth Callback] AUTH_TOKENS KV not configured')
      return Response.redirect(`${baseUrl}/#auth?error=service_not_configured`, 302)
    }

    const code = requestUrl.searchParams.get('code')
    const state = requestUrl.searchParams.get('state')
    const error = requestUrl.searchParams.get('error')

    // 处理用户拒绝授权
    if (error) {
      return Response.redirect(`${baseUrl}/#auth?error=access_denied`, 302)
    }

    if (!code || !state) {
      return Response.redirect(`${baseUrl}/#auth?error=invalid_request`, 302)
    }

    // 验证 state
    const storedState = await context.env.AUTH_TOKENS.get(`state:${state}`)
    if (!storedState) {
      return Response.redirect(`${baseUrl}/#auth?error=invalid_state`, 302)
    }

    // 删除已使用的 state
    await context.env.AUTH_TOKENS.delete(`state:${state}`)

    // 用 code 换取 access_token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: context.env.GITHUB_CLIENT_SECRET,
        code: code
      })
    })

    const tokenData = await tokenResponse.json() as any

    if (tokenData.error) {
      console.error('[Auth] Token exchange failed:', tokenData.error)
      return Response.redirect(`${baseUrl}/#auth?error=token_exchange_failed`, 302)
    }

    const accessToken = tokenData.access_token

    // 获取 GitHub 用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'NanoKit'
      }
    })

    if (!userResponse.ok) {
      console.error('[Auth] Failed to get user info')
      return Response.redirect(`${baseUrl}/#auth?error=user_fetch_failed`, 302)
    }

    const userData = await userResponse.json() as any

    // 生成内部 token
    const internalToken = generateToken()
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天

    // 存储 token 信息到 KV
    await context.env.AUTH_TOKENS.put(`token:${internalToken}`, JSON.stringify({
      github_id: userData.id,
      login: userData.login,
      avatar_url: userData.avatar_url,
      created_at: Date.now(),
      expires_at: expiresAt
    }), { expirationTtl: 7 * 86400 }) // 7天过期

    // 重定向到前端，带上 token
    return Response.redirect(`${baseUrl}/#auth?token=${internalToken}`, 302)

  } catch (error: any) {
    console.error('[Auth] Callback error:', error)
    return Response.redirect(`${baseUrl}/#auth?error=server_error`, 302)
  }
}
