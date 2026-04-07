import type { TabType } from '../types'

interface Props {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function BottomTabBar({ activeTab, onTabChange }: Props) {
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'trips', label: '旅程', icon: '✈️' },
    { key: 'notes', label: '筆記', icon: '📝' },
    { key: 'settings', label: '設置', icon: '⚙️' },
  ]

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab-bar-item ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
