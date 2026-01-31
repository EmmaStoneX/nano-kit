// Cloudflare Pages Functions - KV 提示词存储 API
/// <reference path="../env.d.ts" />

interface Env {
  PROMPTS_KV: KVNamespace
}

interface CustomPrompt {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  category?: string
  mode?: 'generate' | 'edit'
  preview?: string
  author?: string
}

// 获取设备ID对应的 KV key
function getDeviceKey(deviceId: string): string {
  return `prompts:${deviceId}`
}

// GET - 获取提示词列表
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const deviceId = url.searchParams.get('deviceId')

  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'Missing deviceId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const key = getDeviceKey(deviceId)
  const data = await context.env.PROMPTS_KV.get(key, 'json')
  const prompts: CustomPrompt[] = (data as CustomPrompt[]) || []

  return new Response(JSON.stringify({ prompts }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// POST - 保存/更新提示词
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      deviceId: string
      prompt: CustomPrompt
    }

    const { deviceId, prompt } = body

    if (!deviceId || !prompt) {
      return new Response(JSON.stringify({ error: 'Missing deviceId or prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const key = getDeviceKey(deviceId)
    const data = await context.env.PROMPTS_KV.get(key, 'json')
    let prompts: CustomPrompt[] = (data as CustomPrompt[]) || []

    // 更新或添加
    const existingIndex = prompts.findIndex(p => p.id === prompt.id)
    if (existingIndex > -1) {
      prompts[existingIndex] = { ...prompts[existingIndex], ...prompt, updatedAt: Date.now() }
    } else {
      prompts = [{ ...prompt, createdAt: Date.now(), updatedAt: Date.now() }, ...prompts]
    }

    await context.env.PROMPTS_KV.put(key, JSON.stringify(prompts))

    return new Response(JSON.stringify({ success: true, prompt }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// DELETE - 删除提示词
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const deviceId = url.searchParams.get('deviceId')
  const promptId = url.searchParams.get('id')

  if (!deviceId || !promptId) {
    return new Response(JSON.stringify({ error: 'Missing deviceId or id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const key = getDeviceKey(deviceId)
  const data = await context.env.PROMPTS_KV.get(key, 'json')
  let prompts: CustomPrompt[] = (data as CustomPrompt[]) || []

  prompts = prompts.filter(p => p.id !== promptId)
  await context.env.PROMPTS_KV.put(key, JSON.stringify(prompts))

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// PUT - 批量同步（用于本地数据迁移到云端）
export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      deviceId: string
      prompts: CustomPrompt[]
    }

    const { deviceId, prompts } = body

    if (!deviceId || !Array.isArray(prompts)) {
      return new Response(JSON.stringify({ error: 'Missing deviceId or prompts' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const key = getDeviceKey(deviceId)
    await context.env.PROMPTS_KV.put(key, JSON.stringify(prompts))

    return new Response(JSON.stringify({ success: true, count: prompts.length }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
