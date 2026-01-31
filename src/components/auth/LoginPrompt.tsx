// 登录提示弹窗 - 当用户达到免费次数限制时显示
import { useAppStore } from '../../store/appStore'

interface LoginPromptProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginPrompt({ isOpen, onClose }: LoginPromptProps) {
  const { login } = useAppStore()

  if (!isOpen) return null

  const handleLogin = () => {
    login()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-2xl animate-fade-in">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 图标 */}
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20">
            <svg className="w-8 h-8 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* 标题 */}
        <h2 className="text-xl font-bold text-center text-[var(--text-primary)] mb-2">
          免费次数已用完
        </h2>

        {/* 描述 */}
        <p className="text-center text-[var(--text-secondary)] mb-6">
          每天可免费生成 5 张图片，登录 GitHub 后可解除限制，无限使用。
        </p>

        {/* 登录按钮 */}
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          使用 GitHub 登录
        </button>

        {/* 额外说明 */}
        <p className="text-xs text-center text-[var(--text-tertiary)] mt-4">
          登录后可无限生成图片，数据跨设备同步
        </p>
      </div>
    </div>
  )
}
