// 全局 CORS 中间件 - 限制允许的域名

const ALLOWED_ORIGINS = [
  'https://nano-kit.zxvmax.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173'
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  // 检查 origin 是否在允许列表中
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  }
}

export const onRequest: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  // 处理 OPTIONS 预检请求
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  // 继续处理请求
  const response = await context.next()

  // 添加 CORS 头到响应
  const newResponse = new Response(response.body, response)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value)
  })

  return newResponse
}
