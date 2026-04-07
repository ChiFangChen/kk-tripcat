import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlane, faNoteSticky, faGear } from '@fortawesome/free-solid-svg-icons'
import type { TabType } from '../types'

interface Props {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs: { key: TabType; label: string; icon: typeof faPlane }[] = [
  { key: 'trips', label: '旅程', icon: faPlane },
  { key: 'notes', label: '筆記', icon: faNoteSticky },
  { key: 'settings', label: '設置', icon: faGear },
]

export function BottomTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab-bar-item ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          <FontAwesomeIcon icon={tab.icon} className="text-lg" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
