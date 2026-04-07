import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThumbtack, faPlus, faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../context/AppContext'
import { Modal } from '../components/Modal'
import { generateId } from '../utils/id'
import type { TemplateCategory, TemplateItem } from '../types'

export function SettingsPage() {
  const { state, dispatch } = useApp()
  const template = state.template
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState(template.notes)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState('')
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null)

  function saveNotes() {
    dispatch({ type: 'SET_TEMPLATE', template: { ...template, notes: notesText } })
    setEditingNotes(false)
  }

  function addCategory() {
    if (!newCatName.trim()) return
    const cat: TemplateCategory = { name: newCatName.trim(), items: [] }
    dispatch({ type: 'SET_TEMPLATE', template: { ...template, categories: [...template.categories, cat] } })
    setNewCatName('')
    setAddingCategory(false)
  }

  function renameCategory() {
    if (!editingCategory || !editingCategory.newName.trim()) return
    const updated = template.categories.map(c =>
      c.name === editingCategory.oldName
        ? { ...c, name: editingCategory.newName.trim(), items: c.items.map(i => ({ ...i, category: editingCategory.newName.trim() })) }
        : c
    )
    dispatch({ type: 'SET_TEMPLATE', template: { ...template, categories: updated } })
    setEditingCategory(null)
  }

  function deleteCategory(name: string) {
    dispatch({ type: 'SET_TEMPLATE', template: { ...template, categories: template.categories.filter(c => c.name !== name) } })
  }

  function addItem(catName: string) {
    if (!newItemText.trim()) return
    const item: TemplateItem = { id: generateId(), text: newItemText.trim(), category: catName }
    const updated = template.categories.map(c =>
      c.name === catName ? { ...c, items: [...c.items, item] } : c
    )
    dispatch({ type: 'SET_TEMPLATE', template: { ...template, categories: updated } })
    setNewItemText('')
    setAddingItemTo(null)
  }

  function deleteItem(catName: string, itemId: string) {
    const updated = template.categories.map(c =>
      c.name === catName ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
    )
    dispatch({ type: 'SET_TEMPLATE', template: { ...template, categories: updated } })
  }

  return (
    <div className="page-container">
      <h2 className="text-xl font-bold mb-4">模板設定</h2>

      {/* Notes */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-sm"><FontAwesomeIcon icon={faThumbtack} className="mr-1" />注意事項</h3>
          <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => { setNotesText(template.notes); setEditingNotes(true) }}>
            <FontAwesomeIcon icon={faPen} />
          </button>
        </div>
        <p className="text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-400">
          {template.notes || '(無)'}
        </p>
      </div>

      {/* Categories */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">準備事項分類</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setAddingCategory(true)}><FontAwesomeIcon icon={faPlus} /></button>
      </div>

      {template.categories.map(cat => (
        <div key={cat.name} className="card mb-2">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-sm">{cat.name} ({cat.items.length})</h4>
            <div className="flex gap-2">
              <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => setEditingCategory({ oldName: cat.name, newName: cat.name })}>
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => { setAddingItemTo(cat.name); setNewItemText('') }}>
                <FontAwesomeIcon icon={faPlus} />
              </button>
              <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => deleteCategory(cat.name)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            {cat.items.map(item => (
              <div key={item.id} className="flex justify-between items-center py-0.5">
                <span>{item.text}</span>
                <button className="text-slate-400 dark:text-slate-500 text-xs p-1 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => deleteItem(cat.name, item.id)}>
                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit notes modal */}
      {editingNotes && (
        <Modal title="編輯注意事項" onClose={() => setEditingNotes(false)}>
          <textarea className="form-input" rows={5} value={notesText} onChange={e => setNotesText(e.target.value)} />
          <button className="btn btn-primary w-full mt-3" onClick={saveNotes}>儲存</button>
        </Modal>
      )}

      {/* Add category modal */}
      {addingCategory && (
        <Modal title="新增分類" onClose={() => setAddingCategory(false)}>
          <input className="form-input" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="分類名稱" onKeyDown={e => e.key === 'Enter' && addCategory()} />
          <button className="btn btn-primary w-full mt-3" onClick={addCategory}>新增</button>
        </Modal>
      )}

      {/* Rename category modal */}
      {editingCategory && (
        <Modal title="重命名分類" onClose={() => setEditingCategory(null)}>
          <input className="form-input" value={editingCategory.newName} onChange={e => setEditingCategory({ ...editingCategory, newName: e.target.value })} onKeyDown={e => e.key === 'Enter' && renameCategory()} />
          <button className="btn btn-primary w-full mt-3" onClick={renameCategory}>儲存</button>
        </Modal>
      )}

      {/* Add item modal */}
      {addingItemTo && (
        <Modal title={`新增項目到「${addingItemTo}」`} onClose={() => setAddingItemTo(null)}>
          <input className="form-input" value={newItemText} onChange={e => setNewItemText(e.target.value)} placeholder="項目名稱" onKeyDown={e => e.key === 'Enter' && addItem(addingItemTo)} />
          <button className="btn btn-primary w-full mt-3" onClick={() => addItem(addingItemTo)}>新增</button>
        </Modal>
      )}
    </div>
  )
}
