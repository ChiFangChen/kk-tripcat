import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThumbtack } from '@fortawesome/free-solid-svg-icons'
import type { Template, ChecklistItem, TemplateCategory } from '../types'
import { generateId } from '../utils/id'

interface Props {
  template: Template
  onConfirm: (checklist: ChecklistItem[], preparationNotes: string, updatedTemplate: Template | null) => void
  confirmLabel: string
  confirmWithUpdateLabel: string
}

export function TemplateSelector({ template, onConfirm, confirmLabel, confirmWithUpdateLabel }: Props) {
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>(() => {
    const cats: Record<string, boolean> = {}
    for (const cat of template.categories) cats[cat.name] = true
    return cats
  })
  const [selectedSubcategories, setSelectedSubcategories] = useState<Record<string, boolean>>(() => {
    const subcats: Record<string, boolean> = {}
    for (const cat of template.categories) {
      for (const item of cat.items) {
        if (item.subcategory) subcats[`${cat.name}:${item.subcategory}`] = true
      }
    }
    return subcats
  })
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() => {
    const items: Record<string, boolean> = {}
    for (const cat of template.categories) {
      for (const item of cat.items) items[item.id] = true
    }
    return items
  })

  function toggleCategory(catName: string) {
    const newVal = !selectedCategories[catName]
    setSelectedCategories(prev => ({ ...prev, [catName]: newVal }))
    const cat = template.categories.find(c => c.name === catName)
    if (cat) {
      const itemUpdates: Record<string, boolean> = {}
      const subUpdates: Record<string, boolean> = {}
      for (const item of cat.items) {
        itemUpdates[item.id] = newVal
        if (item.subcategory) subUpdates[`${catName}:${item.subcategory}`] = newVal
      }
      setSelectedItems(prev => ({ ...prev, ...itemUpdates }))
      setSelectedSubcategories(prev => ({ ...prev, ...subUpdates }))
    }
  }

  function toggleSubcategory(catName: string, subName: string) {
    const key = `${catName}:${subName}`
    const newVal = !selectedSubcategories[key]
    setSelectedSubcategories(prev => ({ ...prev, [key]: newVal }))
    const cat = template.categories.find(c => c.name === catName)
    if (cat) {
      const itemUpdates: Record<string, boolean> = {}
      for (const item of cat.items) {
        if (item.subcategory === subName) itemUpdates[item.id] = newVal
      }
      setSelectedItems(prev => ({ ...prev, ...itemUpdates }))
      const anyChecked = cat.items.some(item =>
        item.subcategory === subName ? newVal : selectedItems[item.id]
      )
      setSelectedCategories(prev => ({ ...prev, [catName]: anyChecked }))
    }
  }

  function toggleItem(itemId: string, catName: string) {
    const newVal = !selectedItems[itemId]
    setSelectedItems(prev => ({ ...prev, [itemId]: newVal }))
    const cat = template.categories.find(c => c.name === catName)
    if (cat) {
      const item = cat.items.find(i => i.id === itemId)
      if (item?.subcategory) {
        const subKey = `${catName}:${item.subcategory}`
        const subItems = cat.items.filter(i => i.subcategory === item.subcategory)
        const anySubChecked = subItems.some(i => i.id === itemId ? newVal : selectedItems[i.id])
        setSelectedSubcategories(prev => ({ ...prev, [subKey]: anySubChecked }))
      }
      const anyChecked = cat.items.some(i => i.id === itemId ? newVal : selectedItems[i.id])
      setSelectedCategories(prev => ({ ...prev, [catName]: anyChecked }))
    }
  }

  function isCategoryPartial(catName: string) {
    const cat = template.categories.find(c => c.name === catName)
    if (!cat) return false
    const checkedCount = cat.items.filter(item => selectedItems[item.id]).length
    return checkedCount > 0 && checkedCount < cat.items.length
  }

  function isSubcategoryPartial(catName: string, subName: string) {
    const cat = template.categories.find(c => c.name === catName)
    if (!cat) return false
    const subItems = cat.items.filter(i => i.subcategory === subName)
    const checkedCount = subItems.filter(i => selectedItems[i.id]).length
    return checkedCount > 0 && checkedCount < subItems.length
  }

  function getSubcategories(cat: TemplateCategory) {
    const subs: string[] = []
    for (const item of cat.items) {
      if (item.subcategory && !subs.includes(item.subcategory)) subs.push(item.subcategory)
    }
    return subs
  }

  function buildChecklist(): ChecklistItem[] {
    const checklist: ChecklistItem[] = []
    for (const cat of template.categories) {
      for (const item of cat.items) {
        if (selectedItems[item.id]) {
          checklist.push({
            id: generateId(),
            text: item.text,
            checked: false,
            category: cat.name,
            subcategory: item.subcategory,
          })
        }
      }
    }
    return checklist
  }

  function buildUpdatedTemplate(): Template {
    const categories = template.categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => selectedItems[item.id]),
      }))
      .filter(cat => cat.items.length > 0)
    return { ...template, categories }
  }

  function handleConfirm(updateTemplate: boolean) {
    onConfirm(buildChecklist(), template.notes, updateTemplate ? buildUpdatedTemplate() : null)
  }

  return (
    <div>
      {template.notes && (
        <div className="card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1"><FontAwesomeIcon icon={faThumbtack} className="mr-1" />注意事項</p>
          <p className="text-sm whitespace-pre-wrap">{template.notes}</p>
        </div>
      )}

      {template.categories.map(cat => (
        <div key={cat.name} className="mb-3">
          <label className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer font-semibold text-sm">
            <input
              type="checkbox"
              checked={selectedCategories[cat.name] || false}
              ref={(el) => { if (el) el.indeterminate = isCategoryPartial(cat.name) }}
              onChange={() => toggleCategory(cat.name)}
              className="w-5 h-5 flex-shrink-0"
            />
            {cat.name}
            <span className="text-slate-400 font-normal ml-auto">
              {cat.items.filter(i => selectedItems[i.id]).length}/{cat.items.length}
            </span>
          </label>
          {selectedCategories[cat.name] && (
            <div className="ml-4 mt-1">
              {(() => {
                const subs = getSubcategories(cat)
                const noSubItems = cat.items.filter(i => !i.subcategory)
                return (
                  <>
                    {noSubItems.map(item => (
                      <label key={item.id} className="flex items-center gap-3 py-1.5 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedItems[item.id] || false}
                          onChange={() => toggleItem(item.id, cat.name)}
                          className="w-4 h-4 flex-shrink-0"
                        />
                        {item.text}
                      </label>
                    ))}
                    {subs.map(sub => (
                      <div key={sub} className="mt-1">
                        <label className="flex items-center gap-3 py-1.5 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedSubcategories[`${cat.name}:${sub}`] || false}
                            ref={(el) => { if (el) el.indeterminate = isSubcategoryPartial(cat.name, sub) }}
                            onChange={() => toggleSubcategory(cat.name, sub)}
                            className="w-4 h-4 flex-shrink-0"
                          />
                          {sub}
                          <span className="text-slate-400 font-normal ml-auto text-xs">
                            {cat.items.filter(i => i.subcategory === sub && selectedItems[i.id]).length}/{cat.items.filter(i => i.subcategory === sub).length}
                          </span>
                        </label>
                        <div className="ml-6">
                          {cat.items.filter(i => i.subcategory === sub).map(item => (
                            <label key={item.id} className="flex items-center gap-3 py-1.5 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={selectedItems[item.id] || false}
                                onChange={() => toggleItem(item.id, cat.name)}
                                className="w-4 h-4 flex-shrink-0"
                              />
                              {item.text}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      ))}

      <button className="btn btn-primary w-full mt-4" onClick={() => handleConfirm(true)}>
        {confirmWithUpdateLabel}
      </button>
      <button className="btn btn-secondary w-full mt-2" onClick={() => handleConfirm(false)}>
        {confirmLabel}
      </button>
    </div>
  )
}

