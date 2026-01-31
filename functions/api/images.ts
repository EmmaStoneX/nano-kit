// Cloudflare Pages Functions - R2 图片存储 API
/// <reference path="../env.d.ts" />

interface Env {
  IMAGES_BUCKET: R2Bucket
}

interface ImageMeta {
  id: string
  deviceId: string
  prompt: string
  createdAt: number
  size: number
}

// 最大图片大小：10MB（base64 编码后约 13MB）
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

// 生成设备ID的工具函数（前端也会用）
function generateDeviceId(): string {
  return 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// 获取设备ID对应的文件夹路径
function getDevicePath(deviceId: string): string {
  return `users/${deviceId}/`
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const deviceId = url.searchParams.get('deviceId')
  const imageId = url.searchParams.get('id')

  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'Missing deviceId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 获取单张图片
  if (imageId) {
    const key = `${getDevicePath(deviceId)}${imageId}`
    const object = await context.env.IMAGES_BUCKET.get(key)

    if (!object) {
      return new Response(JSON.stringify({ error: 'Image not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const headers = new Headers()
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png')
    headers.set('Cache-Control', 'public, max-age=31536000')

    return new Response(object.body, { headers })
  }

  // 列出所有图片
  const prefix = getDevicePath(deviceId)
  const listed = await context.env.IMAGES_BUCKET.list({ prefix, limit: 100 })

  const images = listed.objects.map(obj => ({
    id: obj.key.replace(prefix, ''),
    key: obj.key,
    size: obj.size,
    createdAt: obj.uploaded.getTime(),
    prompt: obj.customMetadata?.prompt || '',
    url: `/api/images?deviceId=${deviceId}&id=${obj.key.replace(prefix, '')}`
  })).sort((a, b) => b.createdAt - a.createdAt)

  return new Response(JSON.stringify({ images, count: images.length }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    // 检查请求体大小（Content-Length）
    const contentLength = context.request.headers.get('Content-Length')
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE * 1.5) {
      return new Response(JSON.stringify({ error: 'File too large, max 10MB' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const formData = await context.request.formData()
    const deviceId = formData.get('deviceId') as string
    const imageData = formData.get('image') as string // base64
    const prompt = formData.get('prompt') as string || ''

    if (!deviceId || !imageData) {
      return new Response(JSON.stringify({ error: 'Missing deviceId or image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 检查 base64 数据大小
    if (imageData.length > MAX_IMAGE_SIZE * 1.4) { // base64 约增加 33% 大小
      return new Response(JSON.stringify({ error: 'Image too large, max 10MB' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 解析 base64
    const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return new Response(JSON.stringify({ error: 'Invalid image format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const mimeType = base64Match[1]
    const base64Data = base64Match[2]
    
    // 验证 MIME 类型
    const allowedMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    if (!allowedMimes.includes(mimeType)) {
      return new Response(JSON.stringify({ error: 'Invalid image type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // 再次检查解码后的实际大小
    if (binaryData.length > MAX_IMAGE_SIZE) {
      return new Response(JSON.stringify({ error: 'Image too large, max 10MB' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 生成唯一文件名
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`
    const key = `${getDevicePath(deviceId)}${imageId}`

    // 上传到 R2
    await context.env.IMAGES_BUCKET.put(key, binaryData, {
      httpMetadata: { contentType: mimeType },
      customMetadata: { prompt, deviceId, createdAt: Date.now().toString() }
    })

    return new Response(JSON.stringify({
      success: true,
      id: imageId,
      url: `/api/images?deviceId=${deviceId}&id=${imageId}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const deviceId = url.searchParams.get('deviceId')
  const imageId = url.searchParams.get('id')

  if (!deviceId || !imageId) {
    return new Response(JSON.stringify({ error: 'Missing deviceId or id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const key = `${getDevicePath(deviceId)}${imageId}`
  await context.env.IMAGES_BUCKET.delete(key)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
