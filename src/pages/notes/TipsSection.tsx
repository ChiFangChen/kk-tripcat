import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { Modal } from '../../components/Modal'
import { generateId } from '../../utils/id'
import type { TipNote } from '../../types'

export function TipsSection() {
  const { state, dispatch } = useApp()
  const [editing, setEditing] = useState<TipNote | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')

  const allTags = [...new Set(state.tips.flatMap(t => t.tags))]

  const filtered = state.tips.filter(tip => {
    if (filterTag && !tip.tags.includes(filterTag)) return false
    if (searchText && !tip.title.toLowerCase().includes(searchText.toLowerCase()) && !tip.content.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  function save(tip: TipNote) {
    const exists = state.tips.find(t => t.id === tip.id)
    if (exists) {
      dispatch({ type: 'UPDATE_TIP', tip: { ...tip, updatedAt: new Date().toISOString() } })
    } else {
      dispatch({ type: 'ADD_TIP', tip })
    }
    setEditing(null)
  }

  function remove(id: string) {
    dispatch({ type: 'DELETE_TIP', tipId: id })
  }

  function newTip(): TipNote {
    const now = new Date().toISOString()
    return { id: generateId(), title: '', content: '', tags: [], createdAt: now, updatedAt: now }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">心得 & Tips</h2>
        <button className="btn-round-add" onClick={() => setEditing(newTip())}><FontAwesomeIcon icon={faPlus} className="text-xs" /></button>
      </div>

      <input
        className="form-input mb-3"
        placeholder="搜尋筆記..."
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
      />

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          <button
            className={`tag cursor-pointer ${!filterTag ? 'opacity-100' : 'opacity-50'}`}
            onClick={() => setFilterTag(null)}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`tag cursor-pointer ${filterTag === tag ? 'opacity-100' : 'opacity-50'}`}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><p>還沒有筆記</p></div>
      ) : (
        filtered.map(tip => (
          <div key={tip.id} className="card cursor-pointer" onClick={() => setEditing(tip)}>
            <h3 className="font-semibold mb-1">{tip.title}</h3>
            <p className="text-sm text-slate-500 line-clamp-2 mb-2">{tip.content}</p>
            <div className="flex flex-wrap gap-1">
              {tip.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
            </div>
          </div>
        ))
      )}

      {editing && (
        <Modal title={editing.title ? '編輯筆記' : '新筆記'} onClose={() => setEditing(null)}>
          <TipForm tip={editing} onSave={save} onDelete={() => { remove(editing.id); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
}

function TipForm({ tip, onSave, onDelete }: { tip: TipNote; onSave: (t: TipNote) => void; onDelete: () => void }) {
  const [form, setForm] = useState(tip)
  const [tagsInput, setTagsInput] = useState(tip.tags.join(', '))

  function handleSave() {
    onSave({
      ...form,
      tags: tagsInput.split(',').map(s => s.trim()).filter(Boolean),
    })
  }

  return (
    <div>
      <div className="form-group"><label className="form-label">標題</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">內容</label><textarea className="form-input" rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">標籤（逗號分隔）</label><input className="form-input" value={tagsInput} onChange={e => setTagsInput(e.target.value)} /></div>
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" onClick={handleSave}>儲存</button>
        {tip.title && <button className="btn btn-secondary" onClick={onDelete}>刪除</button>}
      </div>
    </div>
  )
}
