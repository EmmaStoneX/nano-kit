// 用户菜单 - 显示登录状态和用户头像
import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { trackLoginClick, trackLogout } from '../../utils/analytics'

export default function UserMenu() {
  const { auth, login, logout, authLoading, usage, refreshUsage } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ESC 关闭菜单
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleLogin = () => {
    trackLoginClick('header')
    login()
  }

  const handleLogout = () => {
    trackLogout()
    logout()
    setIsOpen(false)
    // 刷新使用次数状态
    refreshUsage()
  }

  if (authLoading) {
    return <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
  }

  // 未登录 - 显示登录按钮
  if (!auth.isAuthenticated) {
    return (
      <button
        onClick={handleLogin}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] transition-colors"
        title="使用 GitHub 登录"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        <span className="hidden sm:inline">登录</span>
        {/* 显示剩余次数 */}
        {!usage.isAuthenticated && usage.remaining < Infinity && (
          <span className="text-xs text-[var(--text-tertiary)]">
            ({usage.remaining}/{usage.total})
          </span>
        )}
      </button>
    )
  }

  // 已登录 - 显示用户头像和下拉菜单
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 p-1 rounded-full hover:bg-[var(--bg-secondary)] transition-colors ${isOpen ? 'bg-[var(--bg-secondary)]' : ''}`}
      >
        {auth.user?.avatar_url ? (
          <img
            src={auth.user.avatar_url}
            alt={auth.user.login}
            className="w-8 h-8 rounded-full border border-[var(--border-color)]"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--accent-color)] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <svg className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform hidden sm:block ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 py-1 z-50 bg-[var(--bg-primary)] backdrop-blur-md rounded-xl shadow-lg border border-[var(--border-color)]">
          {/* 用户信息 */}
          <div className="px-4 py-2 border-b border-[var(--border-color)]">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {auth.user?.login}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              已登录
            </p>
          </div>

          {/* 退出按钮 */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}
