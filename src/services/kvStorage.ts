// KV 云存储服务 - 提示词同步
import type { CustomPrompt } from '../types'
import { getDeviceId } from './r2Storage'

const LOCAL_KEY = 'custom_prompts'
const SYNC_FLAG_KEY = 'prompts_synced'

// 从本地获取提示词
export function getLocalPrompts(): CustomPrompt[] {
  try {
    const data = localStorage.getItem(LOCAL_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// 保存到本地
export function saveLocalPrompts(prompts: CustomPrompt[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(prompts))
}

// 从云端获取提示词
export async function fetchCloudPrompts(): Promise<CustomPrompt[]> {
  try {
    const deviceId = getDeviceId()
    const res = await fetch(`/api/prompts?deviceId=${deviceId}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.prompts || []
  } catch {
    return []
  }
}

// 保存单个提示词到云端
export async function saveCloudPrompt(prompt: CustomPrompt): Promise<boolean> {
  try {
    const deviceId = getDeviceId()
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, prompt })
    })
    return res.ok
  } catch {
    return false
  }
}

// 删除云端提示词
export async function deleteCloudPrompt(promptId: string): Promise<boolean> {
  try {
    const deviceId = getDeviceId()
    const res = await fetch(`/api/prompts?deviceId=${deviceId}&id=${promptId}`, {
      method: 'DELETE'
    })
    return res.ok
  } catch {
    return false
  }
}

// 批量同步到云端
export async function syncPromptsToCloud(prompts: CustomPrompt[]): Promise<boolean> {
  try {
    const deviceId = getDeviceId()
    const res = await fetch('/api/prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, prompts })
    })
    return res.ok
  } catch {
    return false
  }
}

// 初始化同步：首次使用时将本地数据迁移到云端
export async function initPromptSync(): Promise<void> {
  const synced = localStorage.getItem(SYNC_FLAG_KEY)
  if (synced) return

  const localPrompts = getLocalPrompts()
  if (localPrompts.length > 0) {
    // 本地有数据，同步到云端
    const success = await syncPromptsToCloud(localPrompts)
    if (success) {
      localStorage.setItem(SYNC_FLAG_KEY, 'true')
      console.log('Prompts synced to cloud')
    }
  } else {
    // 本地无数据，从云端拉取
    const cloudPrompts = await fetchCloudPrompts()
    if (cloudPrompts.length > 0) {
      saveLocalPrompts(cloudPrompts)
      console.log('Prompts loaded from cloud')
    }
    localStorage.setItem(SYNC_FLAG_KEY, 'true')
  }
}

// 检查 KV 是否可用
export async function isKVAvailable(): Promise<boolean> {
  try {
    const deviceId = getDeviceId()
    const res = await fetch(`/api/prompts?deviceId=${deviceId}`)
    return res.ok
  } catch {
    return false
  }
}
