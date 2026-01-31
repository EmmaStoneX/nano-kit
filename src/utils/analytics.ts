// Umami 自定义事件追踪工具

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void
    }
  }
}

// 通用追踪函数
export function trackEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(event, data)
  }
}

// ========== 用户行为事件 ==========

// 图片生成相关
export const trackImageGenerate = (mode: string, resolution: string, aspectRatio: string) => {
  trackEvent('image_generate', { mode, resolution, aspectRatio })
}

export const trackImageGenerateSuccess = (mode: string, duration: number) => {
  trackEvent('image_generate_success', { mode, duration_ms: duration })
}

export const trackImageGenerateError = (mode: string, error: string) => {
  trackEvent('image_generate_error', { mode, error })
}

// 提示词相关
export const trackPromptSelect = (category: string, promptId: string) => {
  trackEvent('prompt_select', { category, promptId })
}

export const trackPromptSearch = (keyword: string, resultCount: number) => {
  trackEvent('prompt_search', { keyword, resultCount })
}

export const trackPromptSave = () => {
  trackEvent('prompt_save')
}

// 认证相关
export const trackLoginClick = (source: string) => {
  trackEvent('login_click', { source }) // source: 'header', 'limit_prompt', 'settings'
}

export const trackLoginSuccess = () => {
  trackEvent('login_success')
}

export const trackLogout = () => {
  trackEvent('logout')
}

// 页面/功能使用
export const trackPageView = (page: string) => {
  trackEvent('page_view', { page })
}

export const trackFeatureUse = (feature: string) => {
  trackEvent('feature_use', { feature })
}

// 设置相关
export const trackSettingsChange = (setting: string, value: string) => {
  trackEvent('settings_change', { setting, value })
}

export const trackThemeChange = (theme: string) => {
  trackEvent('theme_change', { theme })
}

// 图片操作
export const trackImageDownload = () => {
  trackEvent('image_download')
}

export const trackImageCopy = () => {
  trackEvent('image_copy')
}

export const trackImageShare = (platform: string) => {
  trackEvent('image_share', { platform })
}

// 参考图相关
export const trackReferenceImageUpload = (method: string) => {
  trackEvent('reference_image_upload', { method }) // method: 'drag', 'paste', 'click'
}

// 使用限制相关
export const trackUsageLimitReached = (remaining: number) => {
  trackEvent('usage_limit_reached', { remaining })
}

// 错误追踪
export const trackError = (type: string, message: string) => {
  trackEvent('error', { type, message })
}

// ========== UTM 参数追踪 ==========

export function trackUTMParams() {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)
  const utmSource = params.get('utm_source')
  const utmMedium = params.get('utm_medium')
  const utmCampaign = params.get('utm_campaign')
  const utmContent = params.get('utm_content')
  const ref = params.get('ref')

  if (utmSource || utmMedium || utmCampaign || ref) {
    trackEvent('campaign_visit', {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      ref: ref
    })
  }
}

// ========== 会话追踪 ==========

export function trackSessionStart() {
  const isNewSession = !sessionStorage.getItem('session_started')
  if (isNewSession) {
    sessionStorage.setItem('session_started', 'true')
    trackEvent('session_start', {
      referrer: document.referrer || 'direct',
      landing_page: window.location.pathname
    })
  }
}
