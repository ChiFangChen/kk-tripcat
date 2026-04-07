import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AppProvider, useApp } from './context/AppContext'
import { UpdatePrompt } from './components/UpdatePrompt'
import { BottomTabBar } from './components/BottomTabBar'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { TripsPage } from './pages/TripsPage'
import { TripDetailPage } from './pages/TripDetailPage'
import { NotesPage } from './pages/NotesPage'
import { SettingsPage } from './pages/SettingsPage'
import { UserMenu } from './components/UserMenu'
import { Modal } from './components/Modal'
import type { TabType } from './types'
import './App.css'

function AppContent() {
  const { state, dispatch, loading } = useApp()
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login')
  const [activeTab, setActiveTab] = useState<TabType>('trips')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Join trip via URL: ?join=<tripId>
  const [joinTripId, setJoinTripId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('join')
  })

  // View trip via URL: ?view=<tripId>
  const [viewTripId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('view')
  })

  // Clear query params from URL
  useEffect(() => {
    if (joinTripId || viewTripId) {
      const url = new URL(window.location.href)
      url.searchParams.delete('join')
      url.searchParams.delete('view')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [joinTripId, viewTripId])

  const joinTrip = state.trips.find(t => t.id === joinTripId)

  function handleJoinConfirm() {
    if (!joinTrip || !state.auth.currentUser) return
    if (joinTrip.members.includes(state.auth.currentUser.id)) {
      setNotice('已在旅程中！')
      setJoinTripId(null)
      return
    }
    dispatch({ type: 'UPDATE_TRIP', trip: { ...joinTrip, members: [...joinTrip.members, state.auth.currentUser.id] } })
    setJoinTripId(null)
    setSelectedTripId(joinTrip.id)
  }

  // Viewer mode: no login needed, read-only
  if (viewTripId) {
    return <TripDetailPage tripId={viewTripId} onBack={() => window.location.href = window.location.pathname} viewOnly />
  }

  // Loading Firebase data
  if (loading) {
    return (
      <div className="identity-page">
        <div className="login-logo">🐱</div>
        <p className="text-slate-400 mt-4">載入中...</p>
      </div>
    )
  }

  // Not logged in
  if (!state.auth.currentUser) {
    if (authPage === 'register') {
      return <Register onSwitchToLogin={() => setAuthPage('login')} />
    }
    return <Login onSwitchToRegister={() => setAuthPage('register')} />
  }

  // Join dialog
  const joinDialog = joinTripId && joinTrip ? createPortal(
    <Modal title="加入旅程" onClose={() => setJoinTripId(null)}>
      <p className="text-sm mb-4">是否加入「{joinTrip.name}」旅程？</p>
      <div className="flex gap-2">
        <button className="btn btn-secondary flex-1" onClick={() => setJoinTripId(null)}>取消</button>
        <button className="btn btn-primary flex-1" onClick={handleJoinConfirm}>加入</button>
      </div>
    </Modal>,
    document.body
  ) : joinTripId && !joinTrip ? createPortal(
    <Modal title="加入旅程" onClose={() => setJoinTripId(null)}>
      <p className="text-sm mb-4">找不到此旅程</p>
      <button className="btn btn-secondary w-full" onClick={() => setJoinTripId(null)}>確定</button>
    </Modal>,
    document.body
  ) : null

  const noticeDialog = notice ? createPortal(
    <Modal title="提示" onClose={() => setNotice(null)}>
      <p className="text-sm mb-4">{notice}</p>
      <button className="btn btn-secondary w-full" onClick={() => setNotice(null)}>確定</button>
    </Modal>,
    document.body
  ) : null

  // Inside a trip
  if (selectedTripId) {
    return (
      <>
        <TripDetailPage
          tripId={selectedTripId}
          onBack={() => setSelectedTripId(null)}
        />
        {joinDialog}
        {noticeDialog}
      </>
    )
  }

  // Main app with tabs
  return (
    <>
      <div className="top-bar">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐱</span>
          <span className="font-semibold">KK TripCat</span>
        </div>
        <button
          className="identity-badge"
          onClick={() => setShowUserMenu(true)}
          style={{ backgroundColor: state.auth.currentUser.color, color: 'white' }}
        >
          {state.auth.currentUser.displayName.charAt(0)}
        </button>
      </div>

      {activeTab === 'trips' && (
        <TripsPage onSelectTrip={setSelectedTripId} />
      )}
      {activeTab === 'notes' && <NotesPage />}
      {activeTab === 'settings' && <SettingsPage />}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {showUserMenu && (
        <UserMenu
          onClose={() => setShowUserMenu(false)}
          onSwitchUser={() => {
            setShowUserMenu(false)
            setSelectedTripId(null)
          }}
        />
      )}
      {joinDialog}
      {noticeDialog}
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <UpdatePrompt />
    </AppProvider>
  )
}
