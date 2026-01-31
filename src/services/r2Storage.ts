// R2 云存储服务 - 设备ID方案

const DEVICE_ID_KEY = 'nano_device_id'

// 获取或生成设备ID
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

export interface CloudImage {
  id: string
  url: string
  prompt: string
  createdAt: number
  size: number
}

// 上传图片到 R2
export async function uploadImage(imageBase64: string, prompt: string = ''): Promise<CloudImage | null> {
  try {
    const deviceId = getDeviceId()
    const formData = new FormData()
    formData.append('deviceId', deviceId)
    formData.append('image', imageBase64)
    formData.append('prompt', prompt)

    const res = await fetch('/api/images', {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Upload failed')
    }

    const data = await res.json()
    return {
      id: data.id,
      url: data.url,
      prompt,
      createdAt: Date.now(),
      size: 0
    }
  } catch (e) {
    console.error('R2 upload error:', e)
    return null
  }
}

// 获取云端图片列表
export async function listImages(): Promise<CloudImage[]> {
  try {
    const deviceId = getDeviceId()
    const res = await fetch(`/api/images?deviceId=${deviceId}`)

    if (!res.ok) {
      throw new Error('Failed to list images')
    }

    const data = await res.json()
    return data.images || []
  } catch (e) {
    console.error('R2 list error:', e)
    return []
  }
}

// 删除云端图片
export async function deleteImage(imageId: string): Promise<boolean> {
  try {
    const deviceId = getDeviceId()
    const res = await fetch(`/api/images?deviceId=${deviceId}&id=${imageId}`, {
      method: 'DELETE'
    })

    return res.ok
  } catch (e) {
    console.error('R2 delete error:', e)
    return false
  }
}

// 检查 R2 是否可用（通过尝试列出图片）
export async function isR2Available(): Promise<boolean> {
  try {
    const deviceId = getDeviceId()
    const res = await fetch(`/api/images?deviceId=${deviceId}`)
    return res.ok
  } catch {
    return false
  }
}
