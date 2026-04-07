import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { generateId } from '../../utils/id'
import type { ChecklistItem } from '../../types'

interface Props {
  tripId: string
}

export function PreparationTab({ tripId }: Props) {
  const { state, dispatch, getTripData, cloneTemplate } = useApp()
  const tripData = getTripData(tripId)
  const trip = state.trips.find(t => t.id === tripId)
  const [showCompleted, setShowCompleted] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [showClone, setShowClone] = useState(false)

  const items = tripData.checklist
  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const displayed = showCompleted ? items : unchecked

  // Group by category
  const grouped = displayed.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const cat = item.category || '其他'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  function toggleCheck(id: string) {
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { checklist: updated } })
  }

  function addItem() {
    if (!newItem.trim()) return
    const item: ChecklistItem = {
      id: generateId(),
      text: newItem.trim(),
      checked: false,
      category: newCategory || '其他',
    }
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { checklist: [...items, item] } })
    setNewItem('')
  }

  function deleteItem(id: string) {
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { checklist: items.filter(i => i.id !== id) } })
  }

  function toggleGotReady() {
    if (!trip) return
    dispatch({ type: 'UPDATE_TRIP', trip: { ...trip, gotReady: !trip.gotReady } })
  }

  function handleClone(templateId: string) {
    cloneTemplate(templateId, tripId)
    setShowClone(false)
  }

  return (
    <div>
      <button
        className={`got-ready-btn ${trip?.gotReady ? 'ready' : ''}`}
        onClick={toggleGotReady}
      >
        {trip?.gotReady ? '✅ 準備完成！' : '🎒 Got Ready!'}
      </button>

      {/* Clone from template */}
      {state.templates.length > 0 && (
        <div className="mb-4">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowClone(!showClone)}>
            📋 從模板匯入
          </button>
          {showClone && (
            <div className="mt-2 flex flex-wrap gap-2">
              {state.templates.map(t => (
                <button key={t.id} className="btn btn-sm btn-primary" onClick={() => handleClone(t.id)}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500">
          {unchecked.length} 項未完成 / {items.length} 項
        </span>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={e => setShowCompleted(e.target.checked)}
          />
          顯示已完成 ({checked.length})
        </label>
      </div>

      {/* Add new item */}
      <div className="flex gap-2 mb-4">
        <input
          className="form-input flex-1"
          placeholder="新增項目..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
        />
        <input
          className="form-input w-20"
          placeholder="分類"
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" onClick={addItem}>+</button>
      </div>

      {/* Grouped checklist */}
      {Object.entries(grouped).map(([category, categoryItems]) => (
        <div key={category} className="mb-4">
          <h3 className="text-sm font-semibold text-slate-500 mb-1">{category}</h3>
          <div className="card">
            {categoryItems.map(item => (
              <div key={item.id} className={`checklist-item ${item.checked ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleCheck(item.id)}
                  className="w-5 h-5 flex-shrink-0"
                />
                <span className="flex-1 text-sm">{item.text}</span>
                <button onClick={() => deleteItem(item.id)} className="text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {displayed.length === 0 && (
        <div className="empty-state">
          <p>{showCompleted ? '清單是空的' : '全部準備好了！🎉'}</p>
        </div>
      )}
    </div>
  )
}
