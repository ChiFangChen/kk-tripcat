import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPen, faTrash, faChevronDown, faChevronUp, faNoteSticky } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { FullScreenModal } from '../../components/FullScreenModal'
import { Modal } from '../../components/Modal'
import { InfoRow } from '../../components/InfoRow'
import { generateId } from '../../utils/id'
import type { ScheduleDay, ScheduleActivity, ScheduleNote, BookingInfo } from '../../types'

interface Props {
  tripId: string
}

export function ScheduleTab({ tripId }: Props) {
  const { dispatch, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const schedule = tripData.schedule
  const scheduleNotes = tripData.scheduleNotes || []
  const [selectedActivity, setSelectedActivity] = useState<{ activity: ScheduleActivity; dayIndex: number } | null>(null)
  const [editingActivity, setEditingActivity] = useState<{ activity: ScheduleActivity; dayIndex: number } | null>(null)
  const [showAddDay, setShowAddDay] = useState(false)
  const [newDay, setNewDay] = useState({ date: '', label: '' })
  const [collapsedDays, setCollapsedDays] = useState<Record<number, boolean>>({})

  // Schedule notes state
  const [editingNote, setEditingNote] = useState<ScheduleNote | null>(null)
  const [showAddNote, setShowAddNote] = useState(false)

  function addDay() {
    if (!newDay.date) return
    const day: ScheduleDay = { date: newDay.date, label: newDay.label || newDay.date, activities: [] }
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { schedule: [...schedule, day] } })
    setNewDay({ date: '', label: '' })
    setShowAddDay(false)
  }

  function deleteDay(index: number) {
    const updated = schedule.filter((_, i) => i !== index)
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { schedule: updated } })
  }

  function addActivity(dayIndex: number) {
    setEditingActivity({
      dayIndex,
      activity: { id: generateId(), name: '' },
    })
  }

  function saveActivity(dayIndex: number, activity: ScheduleActivity) {
    const updated = schedule.map((day, i) => {
      if (i !== dayIndex) return day
      const existing = day.activities.find(a => a.id === activity.id)
      const activities = existing
        ? day.activities.map(a => a.id === activity.id ? activity : a)
        : [...day.activities, activity]
      return { ...day, activities }
    })
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { schedule: updated } })
    setEditingActivity(null)
  }

  function deleteActivity(dayIndex: number, activityId: string) {
    const updated = schedule.map((day, i) => {
      if (i !== dayIndex) return day
      return { ...day, activities: day.activities.filter(a => a.id !== activityId) }
    })
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { schedule: updated } })
    setSelectedActivity(null)
  }

  function toggleDay(index: number) {
    setCollapsedDays(prev => ({ ...prev, [index]: !prev[index] }))
  }

  // Schedule notes CRUD
  function saveNote(note: ScheduleNote) {
    const exists = scheduleNotes.find(n => n.id === note.id)
    const updated = exists
      ? scheduleNotes.map(n => n.id === note.id ? note : n)
      : [...scheduleNotes, note]
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { scheduleNotes: updated } })
    setEditingNote(null)
    setShowAddNote(false)
  }

  function deleteNote(id: string) {
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { scheduleNotes: scheduleNotes.filter(n => n.id !== id) } })
    setEditingNote(null)
  }

  return (
    <div>
      {/* Schedule days */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">行程表</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddDay(true)}>
          <FontAwesomeIcon icon={faPlus} className="mr-1" />天
        </button>
      </div>

      {schedule.length === 0 ? (
        <div className="empty-state"><p>尚無行程</p></div>
      ) : (
        schedule.map((day, dayIndex) => (
          <div key={dayIndex} className="card mb-2">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleDay(dayIndex)}>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={collapsedDays[dayIndex] ? faChevronDown : faChevronUp}
                  className="text-xs text-slate-400"
                />
                <h3 className="font-semibold text-sm">{day.label}</h3>
                <span className="text-xs text-slate-400">{day.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{day.activities.length} 項</span>
                <button
                  className="text-red-500 text-xs p-1 bg-red-50 dark:bg-red-900/30 rounded"
                  onClick={(e) => { e.stopPropagation(); deleteDay(dayIndex) }}
                >
                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                </button>
              </div>
            </div>

            {!collapsedDays[dayIndex] && (
              <div className="mt-3">
                {day.activities.map(activity => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 cursor-pointer"
                    onClick={() => setSelectedActivity({ activity, dayIndex })}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {activity.time && <span className="text-xs text-slate-400 font-mono">{activity.time}</span>}
                        <span className="text-sm font-medium">{activity.name}</span>
                      </div>
                      {activity.address && <p className="text-xs text-slate-400 mt-0.5">{activity.address}</p>}
                      {activity.booking?.platform && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {activity.booking.platform}
                          {activity.booking.assignee && <span className="tag ml-1">{activity.booking.assignee}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  className="text-sky-600 text-xs mt-2 px-2 py-1 bg-sky-50 dark:bg-sky-900/30 rounded"
                  onClick={() => addActivity(dayIndex)}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-1" />活動
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* Schedule Notes section */}
      <div className="flex justify-between items-center mt-6 mb-4">
        <h2 className="font-semibold">
          <FontAwesomeIcon icon={faNoteSticky} className="mr-2 text-amber-400" />行程筆記
        </h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddNote(true)}>
          <FontAwesomeIcon icon={faPlus} className="mr-1" />筆記
        </button>
      </div>

      {scheduleNotes.length === 0 ? (
        <div className="text-center text-sm text-slate-400 py-4">備選行程、餐廳推薦、注意事項...</div>
      ) : (
        scheduleNotes.map(note => (
          <div key={note.id} className="card">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-sm">{note.title}</h3>
              <div className="flex gap-2">
                <button className="text-sky-600 text-xs p-1.5 bg-sky-50 dark:bg-sky-900/30 rounded" onClick={() => setEditingNote(note)}>
                  <FontAwesomeIcon icon={faPen} />
                </button>
                <button className="text-red-500 text-xs p-1.5 bg-red-50 dark:bg-red-900/30 rounded" onClick={() => deleteNote(note.id)}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-400">{note.content}</p>
          </div>
        ))
      )}

      {/* Add day modal */}
      {showAddDay && (
        <FullScreenModal title="新增天數" onClose={() => setShowAddDay(false)}>
          <div className="form-group"><label className="form-label">日期</label><input className="form-input" type="date" value={newDay.date} onChange={e => setNewDay({ ...newDay, date: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">標籤（如：4/9 四）</label><input className="form-input" value={newDay.label} onChange={e => setNewDay({ ...newDay, label: e.target.value })} /></div>
          <button className="btn btn-primary w-full" onClick={addDay}>新增</button>
        </FullScreenModal>
      )}

      {/* Activity detail modal */}
      {selectedActivity && (
        <Modal title={selectedActivity.activity.name || '活動'} onClose={() => setSelectedActivity(null)}>
          <InfoRow label="時間" value={selectedActivity.activity.time} />
          <InfoRow label="地址" value={selectedActivity.activity.address} />
          {selectedActivity.activity.googleMapUrl && (
            <div className="py-2">
              <a href={selectedActivity.activity.googleMapUrl} target="_blank" rel="noopener noreferrer" className="map-link">
                📍 Google Map
              </a>
            </div>
          )}
          {selectedActivity.activity.booking?.platform && (
            <InfoRow label="平台" value={
              <>
                {selectedActivity.activity.booking.platform}
                {selectedActivity.activity.booking.assignee && <span className="tag ml-2">{selectedActivity.activity.booking.assignee}</span>}
              </>
            } />
          )}
          <InfoRow label="訂單編號" value={selectedActivity.activity.booking?.orderNumber} />
          <InfoRow label="金額" value={selectedActivity.activity.booking?.amount} />
          <InfoRow label="備註" value={selectedActivity.activity.note || selectedActivity.activity.booking?.note} />
          <div className="flex gap-2 mt-4">
            <button className="btn btn-primary flex-1" onClick={() => {
              setEditingActivity(selectedActivity)
              setSelectedActivity(null)
            }}>
              <FontAwesomeIcon icon={faPen} className="mr-1" />編輯
            </button>
            <button className="btn btn-secondary flex-1" onClick={() => deleteActivity(selectedActivity.dayIndex, selectedActivity.activity.id)}>
              <FontAwesomeIcon icon={faTrash} className="mr-1" />刪除
            </button>
          </div>
        </Modal>
      )}

      {/* Activity edit modal */}
      {editingActivity && (
        <FullScreenModal title="編輯活動" onClose={() => setEditingActivity(null)}>
          <ActivityForm
            activity={editingActivity.activity}
            onSave={(a) => saveActivity(editingActivity.dayIndex, a)}
          />
        </FullScreenModal>
      )}

      {/* Add schedule note */}
      {showAddNote && (
        <FullScreenModal title="新增行程筆記" onClose={() => setShowAddNote(false)}>
          <NoteForm
            note={{ id: generateId(), title: '', content: '' }}
            onSave={saveNote}
          />
        </FullScreenModal>
      )}

      {/* Edit schedule note */}
      {editingNote && (
        <FullScreenModal title="編輯行程筆記" onClose={() => setEditingNote(null)}>
          <NoteForm note={editingNote} onSave={saveNote} />
        </FullScreenModal>
      )}
    </div>
  )
}

function ActivityForm({ activity, onSave }: { activity: ScheduleActivity; onSave: (a: ScheduleActivity) => void }) {
  const [form, setForm] = useState(activity)
  const [booking, setBooking] = useState<BookingInfo>(activity.booking || {})

  function handleSave() {
    onSave({ ...form, booking: Object.values(booking).some(v => v) ? booking : undefined })
  }

  return (
    <div>
      <div className="form-group"><label className="form-label">名稱</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">時間</label><input className="form-input" value={form.time || ''} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="9:00" /></div>
      <div className="form-group"><label className="form-label">地址</label><input className="form-input" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Google Map 連結</label><input className="form-input" value={form.googleMapUrl || ''} onChange={e => setForm({ ...form, googleMapUrl: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">訂位平台</label><input className="form-input" value={booking.platform || ''} onChange={e => setBooking({ ...booking, platform: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">負責人</label><input className="form-input" value={booking.assignee || ''} onChange={e => setBooking({ ...booking, assignee: e.target.value })} placeholder="誰負責訂的" /></div>
      <div className="form-group"><label className="form-label">訂單編號</label><input className="form-input" value={booking.orderNumber || ''} onChange={e => setBooking({ ...booking, orderNumber: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">金額</label><input className="form-input" value={booking.amount || ''} onChange={e => setBooking({ ...booking, amount: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">備註</label><textarea className="form-input" value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
      <button className="btn btn-primary w-full" onClick={handleSave}>儲存</button>
    </div>
  )
}

function NoteForm({ note, onSave }: { note: ScheduleNote; onSave: (n: ScheduleNote) => void }) {
  const [form, setForm] = useState(note)

  return (
    <div>
      <div className="form-group"><label className="form-label">標題</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例：備選餐廳" /></div>
      <div className="form-group"><label className="form-label">內容</label><textarea className="form-input" rows={8} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="自由記錄..." /></div>
      <button className="btn btn-primary w-full" onClick={() => onSave(form)}>儲存</button>
    </div>
  )
}
