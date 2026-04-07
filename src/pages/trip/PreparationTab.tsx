import { useState, useRef, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faSuitcaseRolling, faThumbtack, faPlus } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { FullScreenModal } from '../../components/FullScreenModal'
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteVisibleId, setDeleteVisibleId] = useState<string | null>(null)
  const [fabExpanded, setFabExpanded] = useState(false)
  const fabTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Add form state
  const [newItem, setNewItem] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  const items = tripData.checklist
  const notes = tripData.preparationNotes
  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const displayed = showCompleted ? items : unchecked

  // Get existing categories
  const existingCategories: string[] = []
  for (const item of items) {
    const cat = item.category || '其他'
    if (!existingCategories.includes(cat)) existingCategories.push(cat)
  }

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

  function openAddModal() {
    setNewItem('')
    setSelectedCategory(existingCategories[0] || '其他')
    setNewCategoryName('')
    setCreatingCategory(false)
    setShowAddModal(true)
  }

  function addItem() {
    if (!newItem.trim()) return
    const category = creatingCategory ? newCategoryName.trim() || '其他' : selectedCategory || '其他'
    const item: ChecklistItem = {
      id: generateId(),
      text: newItem.trim(),
      checked: false,
      category,
    }
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { checklist: [...items, item] } })
    setNewItem('')
    setShowAddModal(false)
  }

  function deleteItem(id: string) {
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { checklist: items.filter(i => i.id !== id) } })
    setDeleteVisibleId(null)
  }

  function handleFabClick() {
    if (!fabExpanded) {
      setFabExpanded(true)
      if (fabTimer.current) clearTimeout(fabTimer.current)
      fabTimer.current = setTimeout(() => setFabExpanded(false), 3000)
    } else {
      if (!trip) return
      dispatch({ type: 'UPDATE_TRIP', trip: { ...trip, gotReady: !trip.gotReady } })
      setFabExpanded(false)
      if (fabTimer.current) clearTimeout(fabTimer.current)
    }
  }

  function closeFab() {
    setFabExpanded(false)
    if (fabTimer.current) clearTimeout(fabTimer.current)
  }

  return (
    <div>
      {/* Backdrop to close FAB */}
      {fabExpanded && <div className="fixed inset-0 z-30" onClick={closeFab} />}

      {/* Got Ready FAB */}
      <button
        className={`got-ready-fab ${fabExpanded ? 'expanded' : ''}`}
        onClick={handleFabClick}
      >
        <FontAwesomeIcon icon={trip?.gotReady ? faCircleCheck : faSuitcaseRolling} />
        {fabExpanded && <span>{trip?.gotReady ? '取消準備' : 'Got Ready!'}</span>}
      </button>

      {/* Notes block */}
      {notes && (
        <div className="card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1"><FontAwesomeIcon icon={faThumbtack} className="mr-1" />注意事項</p>
          <p className="text-xs whitespace-pre-wrap text-slate-400 dark:text-slate-500">{notes}</p>
        </div>
      )}

      {/* Progress bar + add */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: items.length ? `${(checked.length / items.length) * 100}%` : '0%',
                background: checked.length === items.length && items.length > 0 ? 'var(--color-success)' : 'var(--color-primary)',
              }}
            />
          </div>
        </div>
        <span className="text-xs text-slate-400 w-8 text-right">
          {items.length ? Math.round((checked.length / items.length) * 100) : 0}%
        </span>
        <button className="btn-round-add" onClick={openAddModal}>
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
      </div>

      {/* Filter segmented control */}
      <div className="flex gap-1 mb-3 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-all ${!showCompleted ? 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium' : 'text-slate-400'}`}
          onClick={() => setShowCompleted(false)}
        >
          未完成 ({unchecked.length})
        </button>
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-all ${showCompleted ? 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium' : 'text-slate-400'}`}
          onClick={() => setShowCompleted(true)}
        >
          全部 ({items.length})
        </button>
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
          <p>{showCompleted ? '清單是空的' : '全部準備好了！'}</p>
        </div>
      )}

      {/* Add item full-screen popup */}
      {showAddModal && (
        <FullScreenModal title="新增準備項目" onClose={() => setShowAddModal(false)}>
          <div className="form-group">
            <label className="form-label">分類</label>
            {!creatingCategory ? (
              <div className="flex gap-2 flex-wrap">
                {existingCategories.map(cat => (
                  <button
                    key={cat}
                    className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCreatingCategory(true)}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-1" />新分類
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="form-input flex-1"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="輸入新分類名稱"
                  autoFocus
                />
                <button className="btn btn-sm btn-secondary" onClick={() => setCreatingCategory(false)}>
                  取消
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">項目內容</label>
            <input
              className="form-input"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder="例：護照"
              onKeyDown={e => e.key === 'Enter' && addItem()}
              autoFocus={!creatingCategory}
            />
          </div>
          <button className="btn btn-primary w-full" onClick={addItem}>新增</button>
        </FullScreenModal>
      )}
    </div>
  )
}
