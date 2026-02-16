import { useAppStore } from '../store/appStore'
import { nativeFetch, escapeHtml, buildOpenAIUrl, buildGeminiUrl } from '../utils/helpers'
import { imageRateLimiter } from '../utils/rateLimit'
import { uploadImage } from './r2Storage'
import type { ImageState } from '../types'
import * as db from '../utils/db'

export async function sendMessage(text: string, images: ImageState[]) {
  const store = useAppStore.getState()
  const {
    resolution,
    aspectRatio,
    getActiveConfig,
    saveMessage,
    updateSessionTitle,
    loadSessions,
    addActiveGeneration,
    removeActiveGeneration,
    showToast,
    checkAndIncrementUsage,
    refreshUsage
  } = store

  const config = getActiveConfig()

  if (!config) {
    showToast('请先在设置中添加 API 渠道', 'warning')
    return
  }
  if (!config.imageModel) {
    showToast('请先在设置中填写绘图模型', 'warning')
    return
  }

  // 先检查使用次数（不扣减），只有成功后才扣减
  const { auth, usage } = store
  if (!auth.isAuthenticated && usage.remaining <= 0) {
    showToast('今日免费次数已用完，请登录后继续使用', 'warning')
    return
  }

  // 检查速率限制
  const waitTime = imageRateLimiter.getWaitTime()
  if (waitTime > 0) {
    showToast(`请求过于频繁，请等待 ${Math.ceil(waitTime / 1000)} 秒`, 'warning')
    return
  }

  // Single-turn generation: every send starts a fresh session.
  const sessionId = await store.createSession('新对话')

  // Save user message
  const userHtml = text ? `<div class="msg-content">${escapeHtml(text).replace(/\n/g, '<br>')}</div>` : ''
  const imagesBase64 = images.map(i => i.base64)
  await saveMessage(sessionId, 'user', text, imagesBase64, userHtml)

  // Update session title if first message
  const messages = await db.getSessionMessages(sessionId)
  if (messages.length <= 1 && text) {
    const newTitle = text.substring(0, 20) + (text.length > 20 ? '...' : '')
    await updateSessionTitle(sessionId, newTitle)
    await loadSessions()
  }

  // Add loading message
  addActiveGeneration(sessionId)

  try {
    // 等待速率限制
    await imageRateLimiter.waitForSlot()

    let data: any

    if (config.type === 'openai') {
      data = await callOpenAIAPI(config, text, imagesBase64, {
        resolution,
        aspectRatio,
        enableModelSuffix: config.enableModelSuffix ?? true
      })
    } else {
      data = await callGeminiAPI(config, text, imagesBase64, {
        resolution,
        aspectRatio,
        enableModelSuffix: config.enableModelSuffix ?? true
      })
    }

    // 成功后重置错误计数
    imageRateLimiter.onSuccess()

    // Process response
    await processResponse(data, sessionId)

    // 生成成功后才扣减使用次数
    await checkAndIncrementUsage()
    refreshUsage()

  } catch (e: any) {
    console.error('API Error:', e)
    let msg = e.message || '未知错误'
    let errorType = 'unknown'
    const is429 = msg.includes('429') || msg.includes('rate') || msg.includes('Too Many') || msg.includes('Resource exhausted')
    const isNoResponse = msg.includes('no response') || msg.includes('No response')
    const isTimeout = msg.includes('timeout') || msg.includes('Timeout') || msg.includes('ETIMEDOUT')
    const isNetwork = msg.includes('network') || msg.includes('Network') || msg.includes('fetch')

    // 记录错误，调整速率
    imageRateLimiter.onError(is429)

    // 友好的错误信息
    if (is429) {
      errorType = 'rate_limit'
      const retryDelay = Math.ceil(imageRateLimiter.getRetryDelay() / 1000)
      msg = `🚫 请求过于频繁，API 限流中\n请等待 ${retryDelay} 秒后重试`
    } else if (isNoResponse) {
      errorType = 'no_response'
      msg = `⚠️ API 无响应\n上游服务可能暂时不可用，请稍后重试`
    } else if (isTimeout) {
      errorType = 'timeout'
      msg = `⏱️ 请求超时\n网络连接超时，请检查网络后重试`
    } else if (isNetwork) {
      errorType = 'network'
      msg = `🌐 网络错误\n请检查网络连接后重试`
    } else {
      // 尝试解析 JSON 错误
      try {
        const jsonErr = JSON.parse(e.message)
        if (jsonErr.error?.message) {
          msg = `❌ ${jsonErr.error.message}`
        }
      } catch (_) {
        msg = `❌ ${msg}`
      }
    }

    // 保存错误消息，带重试按钮
    const errorHtml = `
      <div class="msg-content error-message" style="padding: 16px;">
        <div style="color: var(--danger-color); white-space: pre-wrap; margin-bottom: 12px;">${escapeHtml(msg)}</div>
        <button 
          class="retry-btn" 
          data-session-id="${sessionId}"
          data-prompt="${escapeHtml(text)}"
          style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='var(--bg-secondary)'"
          onmouseout="this.style.background='var(--bg-tertiary)'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          重新生成
        </button>
      </div>
    `
    await saveMessage(sessionId, 'bot', 'Error', [], errorHtml)

    // Toast 提示
    const toastMsg = errorType === 'rate_limit'
      ? '请求限流，请稍后重试'
      : errorType === 'no_response'
        ? 'API 无响应，请稍后重试'
        : '生成失败'
    showToast(toastMsg, 'error', 3000)
  } finally {
    removeActiveGeneration(sessionId)
  }
}

async function callOpenAIAPI(
  config: any,
  text: string,
  imagesBase64: string[],
  options: any
) {
  const { resolution, aspectRatio } = options
  // 直接使用原始模型名，分辨率和比例通过参数传递
  const model = config.imageModel

  const messages: any[] = []

  // Add current message
  const currentMessage: any = {
    role: 'user',
    content: [{ type: 'text', text: text || 'Generate image' }]
  }

  imagesBase64.forEach(b64 => {
    currentMessage.content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${b64}` }
    })
  })

  messages.push(currentMessage)

  // Determine size
  let size = '1024x1024'
  if (resolution === '2K') size = '2048x2048'
  else if (resolution === '4K') size = '4096x4096'

  const payload: any = {
    model,
    messages,
    stream: true,
    size
  }

  if (aspectRatio !== 'auto') {
    payload.aspect_ratio = aspectRatio
  }

  const res = await nativeFetch(buildOpenAIUrl(config.host, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/event-stream')) {
    return await parseStreamResponse(res)
  }

  return await res.json()
}

async function callGeminiAPI(
  config: any,
  text: string,
  imagesBase64: string[],
  options: any
) {
  const { resolution, aspectRatio } = options
  // 直接使用原始模型名，分辨率和比例通过 imageConfig 参数传递
  const model = config.imageModel

  const contents: any[] = []

  // Add current message
  const currentParts: any[] = text ? [{ text }] : [{ text: 'Generate image' }]
  imagesBase64.forEach(b64 => {
    currentParts.push({ inline_data: { mime_type: 'image/jpeg', data: b64 } })
  })
  contents.push({ role: 'user', parts: currentParts })

  const generationConfig: any = {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: { imageSize: resolution }
  }

  if (aspectRatio && aspectRatio !== 'auto') {
    generationConfig.imageConfig.aspectRatio = aspectRatio
  }

  const payload = { contents, generationConfig }

  const res = await nativeFetch(
    buildGeminiUrl(config.host, `/models/${model}:generateContent`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.key
      },
      body: JSON.stringify(payload)
    }
  )

  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))

  return data
}

async function parseStreamResponse(response: Response) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const json = JSON.parse(data)
          if (json.choices?.[0]?.delta?.content) {
            fullContent += json.choices[0].delta.content
          }
        } catch (e) {
          console.warn('Parse SSE error:', e)
        }
      }
    }
  }

  return {
    choices: [{
      message: { content: fullContent }
    }]
  }
}

async function processResponse(data: any, sessionId: number) {
  const store = useAppStore.getState()
  const { saveMessage, bumpGalleryRefreshKey } = store

  let botHtml = ''
  const generatedImages: string[] = []

  // Handle OpenAI format
  if (data.choices?.[0]?.message?.content) {
    const content = data.choices[0].message.content

    // Extract images from markdown
    const dataUrlMatch = content.match(/!\[.*?\]\((data:image\/[^)]+)\)/)
    const httpUrlMatch = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/)

    if (dataUrlMatch) {
      const imageData = dataUrlMatch[1].split(',')[1]
      generatedImages.push(imageData)
      const fullBase64 = dataUrlMatch[1]
      const filename = `gemini_${Date.now()}.png`

      botHtml += createImageHtml(fullBase64, filename)
    } else if (httpUrlMatch) {
      // Fetch remote image
      try {
        const imgRes = await nativeFetch(httpUrlMatch[1])
        const blob = await imgRes.blob()
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(blob)
        })
        generatedImages.push(base64)
        const fullBase64 = `data:image/jpeg;base64,${base64}`
        const filename = `gemini_${Date.now()}.png`
        botHtml += createImageHtml(fullBase64, filename)
      } catch (e) {
        console.error('Failed to fetch image:', e)
      }
    }

    // Extract text content
    const textContent = content
      .replace(/!\[.*?\]\((data:image\/[^)]+)\)/g, '')
      .replace(/!\[.*?\]\((https?:\/\/[^)]+)\)/g, '')
      .trim()

    if (textContent) {
      botHtml = `<div class="msg-content" style="padding:12px 18px; white-space:pre-wrap;">${escapeHtml(textContent)}</div>` + botHtml
    }
  }

  // Handle Gemini format
  if (data.candidates?.[0]?.content?.parts) {
    data.candidates[0].content.parts.forEach((part: any) => {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const fullBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        generatedImages.push(part.inlineData.data)
        const filename = `gemini_${Date.now()}.png`
        botHtml += createImageHtml(fullBase64, filename)
      } else if (part.text) {
        // Check for embedded images in text
        const imgRegex = /!\[([^\]]*)\]\(((?:https?:|data:image\/)[^)]+)\)/g
        let textContent = part.text
        let match

        while ((match = imgRegex.exec(textContent)) !== null) {
          const url = match[2]
          const filename = `image_${Date.now()}.png`

          if (url.startsWith('data:')) {
            const base64Data = url.split(',')[1]
            if (base64Data) generatedImages.push(base64Data)
            botHtml += createImageHtml(url, filename)
          }
        }

        textContent = textContent.replace(imgRegex, '').trim()
        if (textContent) {
          botHtml += `<div class="msg-content" style="padding:12px 18px;"><details class="thought-box"><summary>Thinking / Output</summary><div>${escapeHtml(textContent)}</div></details></div>`
        }
      }
    })
  }

  if (botHtml) {
    await saveMessage(sessionId, 'bot', 'Image Generated', generatedImages, botHtml)
    bumpGalleryRefreshKey()

    // 同步上传到 R2 云存储（后台执行，不阻塞）
    for (const imgBase64 of generatedImages) {
      const fullBase64 = `data:image/png;base64,${imgBase64}`
      uploadImage(fullBase64, 'Generated image').catch(e => {
        console.warn('R2 upload failed:', e)
      })
    }

    store.showToast('生成完成', 'success')
  }
}

function createImageHtml(fullBase64: string, filename: string): string {
  return `
    <div class="msg-content" style="padding:0">
      <div class="img-result-group">
        <img class="generated-image" src="${fullBase64}" data-filename="${filename}">
        <div class="btn-group">
          <div class="tool-btn download">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg> 下载原图
          </div>
          <div class="tool-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg> 设为参考图
          </div>
          <div class="tool-btn slice-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 3L6 21"/>
              <path d="M18 3L18 21"/>
              <path d="M2 12L22 12"/>
            </svg> 切割/表情包
          </div>
        </div>
      </div>
    </div>
  `
}
