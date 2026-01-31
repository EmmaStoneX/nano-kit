// 速率限制器 - 防止 429 错误
// 默认：每 5 秒最多 1 次请求

interface RateLimitConfig {
  minInterval: number // 最小请求间隔（毫秒）
  maxRetries: number  // 429 后最大重试次数
  retryDelay: number  // 重试延迟（毫秒）
}

const DEFAULT_CONFIG: RateLimitConfig = {
  minInterval: 5000,  // 5秒间隔
  maxRetries: 3,
  retryDelay: 10000   // 429后等待10秒重试
}

class RateLimiter {
  private lastRequestTime = 0
  private config: RateLimitConfig
  private consecutiveErrors = 0

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    
    // 如果连续出错，增加等待时间
    const dynamicInterval = this.config.minInterval * (1 + this.consecutiveErrors)
    
    if (elapsed < dynamicInterval) {
      const waitTime = dynamicInterval - elapsed
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  onSuccess(): void {
    this.consecutiveErrors = 0
  }

  onError(is429: boolean): void {
    if (is429) {
      this.consecutiveErrors = Math.min(this.consecutiveErrors + 1, 5)
    }
  }

  getWaitTime(): number {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    const dynamicInterval = this.config.minInterval * (1 + this.consecutiveErrors)
    return Math.max(0, dynamicInterval - elapsed)
  }

  shouldRetry(): boolean {
    return this.consecutiveErrors < this.config.maxRetries
  }

  getRetryDelay(): number {
    return this.config.retryDelay * (1 + this.consecutiveErrors)
  }
}

// 全局单例
export const imageRateLimiter = new RateLimiter({
  minInterval: 5000,  // 生图请求间隔 5 秒
  maxRetries: 3,
  retryDelay: 15000   // 429 后等待 15 秒
})

export const textRateLimiter = new RateLimiter({
  minInterval: 2000,  // 文本请求间隔 2 秒
  maxRetries: 3,
  retryDelay: 10000
})
