import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { Accordion } from '../../components/Accordion'
import { FullScreenModal } from '../../components/FullScreenModal'
import { generateId } from '../../utils/id'
import * as storage from '../../utils/storage'
import type { TransportItem } from '../../types'

interface Props {
  tripId: string
}

export function TransportTab({ tripId }: Props) {
  const { setSharedTripData, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const items = tripData.transport
  const [showAddModal, setShowAddModal] = useState(false)
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
    return openStates[id] ?? true
  }

  function toggleOpen(id: string) {
    setOpenStates(prev => ({ ...prev, [id]: !isOpen(id) }))
  }

  function openAdd() {
    setNewTitle('')
    setShowAddModal(true)
  }

  function addItem() {
    if (!newTitle.trim()) return
    const item: TransportItem = { id: generateId(), title: newTitle.trim(), content: '', isOpen: true }
    setSharedTripData(tripId, { transport: [...items, item] })
    setNewTitle('')
    setShowAddModal(false)
  }

  function deleteItem(id: string) {
    setSharedTripData(tripId, { transport: items.filter(i => i.id !== id) })
  }

  function saveContent(id: string) {
    const updated = items.map(i => i.id === id ? { ...i, content: editContent } : i)
    setSharedTripData(tripId, { transport: updated })
    setEditingId(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">交通資訊</h2>
        <button className="btn-round-add" onClick={openAdd}>
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
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
                <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => { setEditingId(item.id); setEditContent(item.content) }}>
                  <FontAwesomeIcon icon={faPen} />
                </button>
                <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => deleteItem(item.id)}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          )}
        </Accordion>
      ))}

      {showAddModal && (
        <FullScreenModal title="新增交通項目" onClose={() => setShowAddModal(false)}>
          <div className="form-group">
            <label className="form-label">標題</label>
            <input
              className="form-input"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="例：機場到飯店"
              onKeyDown={e => e.key === 'Enter' && addItem()}
              autoFocus
            />
          </div>
          <button className="btn btn-primary w-full" onClick={addItem}>新增</button>
        </FullScreenModal>
      )}
    </div>
  )
}
