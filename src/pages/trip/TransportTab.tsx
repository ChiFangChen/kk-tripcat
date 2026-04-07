import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { Accordion } from '../../components/Accordion'
import { generateId } from '../../utils/id'
import * as storage from '../../utils/storage'
import type { TransportItem } from '../../types'

interface Props {
  tripId: string
}

export function TransportTab({ tripId }: Props) {
  const { dispatch, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const items = tripData.transport
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Remember open/close state
  const openStateKey = `transport-open-${tripId}`
  const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
    return storage.getItem<Record<string, boolean>>(openStateKey) || {}
  })

  useEffect(() => {
    storage.setItem(openStateKey, openStates)
  }, [openStates, openStateKey])

  function isOpen(id: string) {
    // Default to open if no saved state
    return openStates[id] ?? true
  }

  function toggleOpen(id: string) {
    setOpenStates(prev => ({ ...prev, [id]: !isOpen(id) }))
  }

  function addItem() {
    if (!newTitle.trim()) return
    const item: TransportItem = { id: generateId(), title: newTitle.trim(), content: '', isOpen: true }
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { transport: [...items, item] } })
    setNewTitle('')
  }

  function deleteItem(id: string) {
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { transport: items.filter(i => i.id !== id) } })
  }

  function saveContent(id: string) {
    const updated = items.map(i => i.id === id ? { ...i, content: editContent } : i)
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { transport: updated } })
    setEditingId(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">交通資訊</h2>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="form-input flex-1"
          placeholder="新增交通項目..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
        />
        <button className="btn btn-primary btn-sm" onClick={addItem}>+</button>
      </div>

      {items.length === 0 && (
        <div className="empty-state"><p>尚無交通資訊</p></div>
      )}

      {items.map(item => (
        <Accordion
          key={item.id}
          title={item.title}
          isOpen={isOpen(item.id)}
          onToggle={() => toggleOpen(item.id)}
        >
          {editingId === item.id ? (
            <div>
              <textarea
                className="form-input mb-2"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={5}
              />
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => saveContent(item.id)}>儲存</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>取消</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="whitespace-pre-wrap text-sm mb-2">{item.content || '(尚無內容)'}</div>
              <div className="flex gap-2">
                <button className="text-sky-600 text-xs px-2 py-1 bg-sky-50 dark:bg-sky-900/30 rounded" onClick={() => { setEditingId(item.id); setEditContent(item.content) }}>編輯</button>
                <button className="text-red-500 text-xs px-2 py-1 bg-red-50 dark:bg-red-900/30 rounded" onClick={() => deleteItem(item.id)}>刪除</button>
              </div>
            </div>
          )}
        </Accordion>
      ))}
    </div>
  )
}
