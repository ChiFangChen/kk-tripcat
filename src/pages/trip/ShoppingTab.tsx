import { useState, useRef, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { generateId } from '../../utils/id'
import type { ShoppingItem, FavoriteItem } from '../../types'

interface Props {
  tripId: string
}

export function ShoppingTab({ tripId }: Props) {
  const { state, dispatch, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const items = tripData.shopping
  const [showCompleted, setShowCompleted] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [matchingFavorites, setMatchingFavorites] = useState<FavoriteItem[]>([])
  const [pendingItem, setPendingItem] = useState<string | null>(null)
  const [deleteVisibleId, setDeleteVisibleId] = useState<string | null>(null)

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

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const displayed = showCompleted ? items : unchecked

  function toggleCheck(id: string) {
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { shopping: updated } })
  }

  function addItem() {
    if (!newItem.trim()) return
    const text = newItem.trim()

    const matches = state.favorites.filter(f =>
      f.name.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(f.name.toLowerCase())
    )

    if (matches.length > 0) {
      setMatchingFavorites(matches)
      setPendingItem(text)
    } else {
      createItem(text)
    }
  }

  function createItem(text: string, favoriteId?: string) {
    const item: ShoppingItem = {
      id: generateId(),
      text,
      checked: false,
      starred: !!favoriteId,
      favoriteId,
    }
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { shopping: [...items, item] } })
    setNewItem('')
    setMatchingFavorites([])
    setPendingItem(null)
  }

  function deleteItem(id: string) {
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { shopping: items.filter(i => i.id !== id) } })
    setDeleteVisibleId(null)
  }

  function toggleStar(item: ShoppingItem) {
    if (item.starred && item.favoriteId) {
      const fav = state.favorites.find(f => f.id === item.favoriteId)
      if (fav && fav.purchases.length > 0) {
        alert('此商品已有購買紀錄，請到筆記 > 喜歡的東西中刪除')
        return
      }
      const updated = items.map(i => i.id === item.id ? { ...i, starred: false, favoriteId: undefined } : i)
      dispatch({ type: 'SET_TRIP_DATA', tripId, data: { shopping: updated } })
      if (fav) {
        dispatch({ type: 'DELETE_FAVORITE', favoriteId: fav.id })
      }
    } else {
      const newFav: FavoriteItem = { id: generateId(), name: item.text, purchases: [] }
      dispatch({ type: 'ADD_FAVORITE', favorite: newFav })
      const updated = items.map(i => i.id === item.id ? { ...i, starred: true, favoriteId: newFav.id } : i)
      dispatch({ type: 'SET_TRIP_DATA', tripId, data: { shopping: updated } })
    }
  }

  function getFavoriteHistory(favoriteId?: string) {
    if (!favoriteId) return null
    const fav = state.favorites.find(f => f.id === favoriteId)
    if (!fav || fav.purchases.length === 0) return null
    return fav
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500">
          {unchecked.length} 項未買 / {items.length} 項
        </span>
        <label className="filter-toggle">
          <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />
          顯示已買 ({checked.length})
        </label>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="form-input flex-1"
          placeholder="新增購物項目..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
        />
        <button className="btn btn-primary btn-sm" onClick={addItem}>+</button>
      </div>

      {matchingFavorites.length > 0 && pendingItem && (
        <div className="card mb-4 border-amber-300">
          <p className="text-sm mb-2">找到相似的「喜歡的東西」，要連結嗎？</p>
          {matchingFavorites.map(fav => (
            <button key={fav.id} className="btn btn-sm btn-primary mr-2 mb-1" onClick={() => createItem(pendingItem, fav.id)}>
              🔗 {fav.name}
            </button>
          ))}
          <button className="btn btn-sm btn-secondary mb-1" onClick={() => createItem(pendingItem)}>
            不連結，直接新增
          </button>
        </div>
      )}

      <div className="card">
        {displayed.map(item => (
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
            <div className="flex-1">
              <span className="text-sm">{item.text}</span>
              {item.starred && (() => {
                const fav = getFavoriteHistory(item.favoriteId)
                if (!fav) return null
                const latest = fav.purchases[0]
                return (
                  <p className="text-xs text-slate-400">
                    上次：{latest.amount}{latest.currency ? ` ${latest.currency}` : ''} ({latest.date})
                  </p>
                )
              })()}
            </div>
            <button className={`star-btn ${item.starred ? 'active' : ''}`} onClick={() => toggleStar(item)}>
              {item.starred ? '★' : '☆'}
            </button>
            {deleteVisibleId === item.id && (
              <button
                onClick={() => deleteItem(item.id)}
                className="text-red-500 text-xs px-2 py-1 bg-red-50 dark:bg-red-900/30 rounded"
              >
                刪除
              </button>
            )}
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="py-4 text-center text-sm text-slate-400">
            {showCompleted ? '購物清單是空的' : '全部買好了！🎉'}
          </div>
        )}
      </div>
    </div>
  )
}
