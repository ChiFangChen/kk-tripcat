import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Modal } from '../../components/Modal'
import { InfoRow } from '../../components/InfoRow'
import { generateId } from '../../utils/id'
import type { ScheduleDay, ScheduleActivity, BookingInfo } from '../../types'

interface Props {
  tripId: string
}

export function ScheduleTab({ tripId }: Props) {
  const { dispatch, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const schedule = tripData.schedule
  const [selectedActivity, setSelectedActivity] = useState<{ activity: ScheduleActivity; dayIndex: number } | null>(null)
  const [editingActivity, setEditingActivity] = useState<{ activity: ScheduleActivity; dayIndex: number } | null>(null)
  const [showAddDay, setShowAddDay] = useState(false)
  const [newDay, setNewDay] = useState({ date: '', label: '' })

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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">行程表</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddDay(true)}>+ 天</button>
      </div>

      {showAddDay && (
        <div className="card mb-4">
          <div className="form-group"><label className="form-label">日期</label><input className="form-input" type="date" value={newDay.date} onChange={e => setNewDay({ ...newDay, date: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">標籤（如：4/9 四）</label><input className="form-input" value={newDay.label} onChange={e => setNewDay({ ...newDay, label: e.target.value })} /></div>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={addDay}>新增</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddDay(false)}>取消</button>
          </div>
        </div>
      )}

      {schedule.length === 0 ? (
        <div className="empty-state"><p>尚無行程</p></div>
      ) : (
        <div className="schedule-table-wrapper">
          <p className="text-xs text-slate-400 mb-2">← 左右滑動 →</p>
          <table className="schedule-table">
            <thead>
              <tr>
                {schedule.map((day, i) => (
                  <th key={i}>
                    <div className="flex justify-between items-center">
                      <span>{day.label}</span>
                      <button className="text-white/70 text-xs ml-2" onClick={() => deleteDay(i)}>✕</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {schedule.map((day, dayIndex) => (
                  <td key={dayIndex}>
                    {day.activities.map(activity => (
                      <div
                        key={activity.id}
                        className="schedule-activity"
                        onClick={() => setSelectedActivity({ activity, dayIndex })}
                      >
                        {activity.time && <span className="text-xs text-slate-400">{activity.time} </span>}
                        <span>{activity.name}</span>
                      </div>
                    ))}
                    <button
                      className="text-sky-500 text-xs mt-1"
                      onClick={() => addActivity(dayIndex)}
                    >
                      + 活動
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
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
            <InfoRow label="平台" value={selectedActivity.activity.booking.platform} />
          )}
          <InfoRow label="訂單編號" value={selectedActivity.activity.booking?.orderNumber} />
          <InfoRow label="金額" value={selectedActivity.activity.booking?.amount} />
          <InfoRow label="備註" value={selectedActivity.activity.note || selectedActivity.activity.booking?.note} />
          <div className="flex gap-2 mt-4">
            <button className="btn btn-primary flex-1" onClick={() => {
              setEditingActivity(selectedActivity)
              setSelectedActivity(null)
            }}>編輯</button>
            <button className="btn btn-secondary flex-1" onClick={() => deleteActivity(selectedActivity.dayIndex, selectedActivity.activity.id)}>刪除</button>
          </div>
        </Modal>
      )}

      {/* Activity edit modal */}
      {editingActivity && (
        <Modal title="編輯活動" onClose={() => setEditingActivity(null)}>
          <ActivityForm
            activity={editingActivity.activity}
            onSave={(a) => saveActivity(editingActivity.dayIndex, a)}
          />
        </Modal>
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
      <div className="form-group"><label className="form-label">訂單編號</label><input className="form-input" value={booking.orderNumber || ''} onChange={e => setBooking({ ...booking, orderNumber: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">金額</label><input className="form-input" value={booking.amount || ''} onChange={e => setBooking({ ...booking, amount: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">備註</label><textarea className="form-input" value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
      <button className="btn btn-primary w-full" onClick={handleSave}>儲存</button>
    </div>
  )
}
