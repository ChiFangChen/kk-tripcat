import { useState } from 'react'
import type { NoteTabType } from '../types'
import { TipsSection } from './notes/TipsSection'
import { FavoritesSection } from './notes/FavoritesSection'

export function NotesPage() {
  const [activeTab, setActiveTab] = useState<NoteTabType>('tips')

  return (
    <div>
      <div className="trip-tabs">
        <button className={`trip-tab ${activeTab === 'tips' ? 'active' : ''}`} onClick={() => setActiveTab('tips')}>
          心得 & Tips
        </button>
        <button className={`trip-tab ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => setActiveTab('favorites')}>
          喜歡的東西
        </button>
      </div>
      <div className="page-container">
        {activeTab === 'tips' && <TipsSection />}
        {activeTab === 'favorites' && <FavoritesSection />}
      </div>
    </div>
  )
}
