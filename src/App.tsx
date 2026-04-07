import { useState } from 'react'
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
import type { TabType } from './types'
import './App.css'

function AppContent() {
  const { state } = useApp()
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login')
  const [activeTab, setActiveTab] = useState<TabType>('trips')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Not logged in
  if (!state.auth.currentUser) {
    if (authPage === 'register') {
      return <Register onSwitchToLogin={() => setAuthPage('login')} />
    }
    return <Login onSwitchToRegister={() => setAuthPage('register')} />
  }

  // Inside a trip
  if (selectedTripId) {
    return (
      <TripDetailPage
        tripId={selectedTripId}
        onBack={() => setSelectedTripId(null)}
      />
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
