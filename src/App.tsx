import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import { UpdatePrompt } from './components/UpdatePrompt'
import { BottomTabBar } from './components/BottomTabBar'
import { TripsPage } from './pages/TripsPage'
import { TripDetailPage } from './pages/TripDetailPage'
import { NotesPage } from './pages/NotesPage'
import { SettingsPage } from './pages/SettingsPage'
import type { TabType } from './types'
import './App.css'

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('trips')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  if (selectedTripId) {
    return (
      <TripDetailPage
        tripId={selectedTripId}
        onBack={() => setSelectedTripId(null)}
      />
    )
  }

  return (
    <>
      {activeTab === 'trips' && (
        <TripsPage onSelectTrip={setSelectedTripId} />
      )}
      {activeTab === 'notes' && <NotesPage />}
      {activeTab === 'settings' && <SettingsPage />}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
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
