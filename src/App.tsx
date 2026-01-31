import { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import Layout from './components/Layout'
import Toast from './components/ui/Toast'
import Lightbox from './components/ui/Lightbox'
import GlobalLoading from './components/ui/GlobalLoading'
import { trackSessionStart, trackUTMParams } from './utils/analytics'

function App() {
  const { theme, initTheme, initProviders, initDB, restoreAuth, handleAuthCallback, refreshUsage } = useAppStore()

  useEffect(() => {
    initTheme()
    initProviders()
    // 初始化分析追踪
    trackSessionStart()
    trackUTMParams()
  }, [initTheme, initProviders])

  useEffect(() => {
    initDB()
  }, [initDB])

  // 初始化认证状态
  useEffect(() => {
    // 先处理 OAuth 回调
    handleAuthCallback().then(() => {
      // 然后恢复登录状态
      restoreAuth().then(() => {
        // 最后刷新使用次数
        refreshUsage()
      })
    })
  }, [handleAuthCallback, restoreAuth, refreshUsage])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="h-screen w-screen overflow-hidden">
      <Layout />
      <Toast />
      <Lightbox />
      <GlobalLoading />
    </div>
  )
}

export default App
