/// <reference types="vite-plugin-pwa/react" />
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-4 right-4 flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl z-50 shadow-lg">
      <span className="text-sm">有新版本可用</span>
      <button
        className="px-3 py-1 text-sm bg-sky-500 text-white rounded-lg"
        onClick={() => updateServiceWorker(true)}
      >
        更新
      </button>
    </div>
  )
}
