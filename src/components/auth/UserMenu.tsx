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
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        title="使用 GitHub 登录"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        <span className="text-xs">登录</span>
        {/* 显示剩余次数 */}
        {!usage.isAuthenticated && usage.remaining < Infinity && (
          <span className="text-xs text-[var(--text-tertiary)]">
            {usage.remaining}
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
        className={`flex items-center gap-1.5 px-2 py-1.5 hover:bg-[var(--bg-tertiary)] transition-colors ${isOpen ? 'bg-[var(--bg-tertiary)]' : ''}`}
      >
        {auth.user?.avatar_url ? (
          <img
            src={auth.user.avatar_url}
            alt={auth.user.login}
            className="w-7 h-7 rounded-full border border-[var(--border-color)]"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[var(--accent-color)] flex items-center justify-center">
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
