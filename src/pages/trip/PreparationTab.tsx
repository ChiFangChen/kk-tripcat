import { useState, useRef, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faSuitcaseRolling, faThumbtack } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { generateId } from '../../utils/id'
import type { ChecklistItem } from '../../types'

interface Props {
  tripId: string
}

export function PreparationTab({ tripId }: Props) {
  const { state, dispatch, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const trip = state.trips.find(t => t.id === tripId)
  const [showCompleted, setShowCompleted] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [deleteVisibleId, setDeleteVisibleId] = useState<string | null>(null)

  const items = tripData.checklist
  const notes = tripData.preparationNotes
  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const displayed = showCompleted ? items : unchecked

  // Group by category, preserving order
  const categoryOrder: string[] = []
  const grouped: Record<string, ChecklistItem[]> = {}
  for (const item of displayed) {
    const cat = item.category || '其他'
    if (!grouped[cat]) {
      grouped[cat] = []
      categoryOrder.push(cat)
    }
    grouped[cat].push(item)
  }

  // Long press handling
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTouchStart = useCallback((id: string) => {
    longPressTimer.current = setTimeout(() => {
      setDeleteVisibleId(prev => prev === id ? null : id)
    }, 500)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

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
    setDeleteVisibleId(null)
  }

  function toggleGotReady() {
    if (!trip) return
    dispatch({ type: 'UPDATE_TRIP', trip: { ...trip, gotReady: !trip.gotReady } })
  }

  return (
    <div>
      <button
        className={`got-ready-btn ${trip?.gotReady ? 'ready' : ''}`}
        onClick={toggleGotReady}
      >
        <FontAwesomeIcon icon={trip?.gotReady ? faCircleCheck : faSuitcaseRolling} className="mr-2" />
        {trip?.gotReady ? '準備完成！' : 'Got Ready!'}
      </button>

      {/* Notes block */}
      {notes && (
        <div className="card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1"><FontAwesomeIcon icon={faThumbtack} className="mr-1" />注意事項</p>
          <p className="text-sm whitespace-pre-wrap">{notes}</p>
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
      {categoryOrder.map(category => {
        const catItems = grouped[category]
        const subOrder: string[] = []
        const subGrouped: Record<string, ChecklistItem[]> = {}
        for (const item of catItems) {
          const sub = item.subcategory || ''
          if (!(sub in subGrouped)) {
            subGrouped[sub] = []
            subOrder.push(sub)
          }
          subGrouped[sub].push(item)
        }
        const hasSubs = subOrder.some(s => s !== '')

        const renderItem = (item: ChecklistItem) => (
          <div
            key={item.id}
            className={`checklist-item ${item.checked ? 'checked' : ''}`}
            onTouchStart={() => handleTouchStart(item.id)}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onDoubleClick={() => setDeleteVisibleId(prev => prev === item.id ? null : item.id)}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleCheck(item.id)}
              className="w-5 h-5 flex-shrink-0"
            />
            <span className="flex-1 text-sm">{item.text}</span>
            {deleteVisibleId === item.id && (
              <button
                onClick={() => deleteItem(item.id)}
                className="text-red-500 text-xs px-2 py-1 bg-red-50 dark:bg-red-900/30 rounded"
              >
                刪除
              </button>
            )}
          </div>
        )

        return (
          <div key={category} className="mb-4">
            <h3 className="text-sm font-semibold text-slate-500 mb-1">{category}</h3>
            <div className="card">
              {subOrder.map(sub => (
                <div key={sub || '_none'}>
                  {hasSubs && sub && (
                    <p className="text-xs font-medium text-slate-400 mt-2 mb-0.5 first:mt-0 px-1">{sub}</p>
                  )}
                  {subGrouped[sub].map(renderItem)}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {displayed.length === 0 && (
        <div className="empty-state">
          <p>{showCompleted ? '清單是空的' : '全部準備好了！🎉'}</p>
        </div>
      )}
    </div>
  )
}
