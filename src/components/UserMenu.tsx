import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSync, faTrash, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../context/AppContext'
import { Modal } from './Modal'

interface Props {
  onClose: () => void
  onSwitchUser?: () => void
}

const ADMIN_SESSION_KEY = 'kk-tripcat-admin-session'

export function UserMenu({ onClose, onSwitchUser }: Props) {
  const { state, login, logout, register, updateUser, isCurrentUserAdmin } = useApp()
  const currentUser = state.auth.currentUser
  const admin = isCurrentUserAdmin()
  const [view, setView] = useState<'menu' | 'register' | 'manage' | 'switch' | 'resetpw'>('menu')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [regError, setRegError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (!currentUser) return null

  const handleColorChange = (color: string) => {
    updateUser({ ...currentUser, color })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    if (!username.trim()) { setRegError('請輸入帳號'); return }
    if (state.users.some(u => u.username === username && !u.deleted)) { setRegError('帳號已存在'); return }
    await register(username, password, displayName || username)
    setUsername(''); setPassword(''); setDisplayName('')
    setView('menu')
  }

  const handleSaveName = (userId: string) => {
    const user = state.users.find(u => u.id === userId)
    if (user && editingName.trim() && editingName.trim() !== user.displayName) {
      updateUser({ ...user, displayName: editingName.trim() })
    }
    setEditingUserId(null)
  }

  const handleDeleteUser = (userId: string) => {
    const user = state.users.find(u => u.id === userId)
    if (user) updateUser({ ...user, deleted: true })
    setConfirmDelete(null)
    if (userId === currentUser.id && adminSessionId) handleSwitchBackToAdmin()
  }

  const adminSessionId = localStorage.getItem(ADMIN_SESSION_KEY)

  const handleSwitchUser = (user: typeof currentUser) => {
    if (!user) return
    if (admin && !adminSessionId) {
      localStorage.setItem(ADMIN_SESSION_KEY, currentUser.id)
    }
    login(user)
    onClose()
    onSwitchUser?.()
  }

  const handleSwitchBackToAdmin = () => {
    if (!adminSessionId) return
    const adminUser = state.users.find(u => u.id === adminSessionId)
    if (!adminUser) return
    localStorage.removeItem(ADMIN_SESSION_KEY)
    login(adminUser)
    onClose()
    onSwitchUser?.()
  }

  const activeUsers = state.users.filter(u => !u.deleted).sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1
    if (!a.isAdmin && b.isAdmin) return 1
    return 0
  })
  const isAdminSession = admin || !!adminSessionId
  const otherUsers = activeUsers.filter(u => u.id !== currentUser.id)
  const realAdminId = state.users.find(u => u.isAdmin)?.id

  return (
    <Modal title="帳號管理" onClose={onClose}>
      {view === 'menu' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">{currentUser.displayName}</span>
            <label className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer" style={{ backgroundColor: currentUser.color }}>
              <FontAwesomeIcon icon={faSync} className="text-white text-xs" />
              <input type="color" value={currentUser.color || '#888888'} onChange={e => handleColorChange(e.target.value)} className="hidden" />
            </label>
          </div>

          {adminSessionId && (
            <button className="btn btn-primary w-full" onClick={handleSwitchBackToAdmin}>返回管理員</button>
          )}
          {isAdminSession && <button className="btn btn-secondary w-full" onClick={() => setView('manage')}>管理使用者</button>}
          {isAdminSession && <button className="btn btn-secondary w-full" onClick={() => setView('register')}>新增使用者</button>}
          {isAdminSession && <button className="btn btn-secondary w-full" onClick={() => setView('switch')}>切換使用者</button>}
          <button className="btn btn-secondary w-full" onClick={() => { setNewPassword(''); setResetSuccess(false); setView('resetpw') }}>重置密碼</button>
          <button className="btn w-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" onClick={() => {
            localStorage.removeItem(ADMIN_SESSION_KEY)
            localStorage.removeItem('kk-tripcat-route-trip')
            onSwitchUser?.()
            logout()
          }}>登出</button>
        </div>
      )}

      {view === 'register' && (
        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <h3 className="font-semibold">新增使用者</h3>
          <div className="form-group"><label className="form-label">帳號</label><input className="form-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" autoFocus required /></div>
          <div className="form-group">
            <label className="form-label">密碼</label><input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" required />
            <p className="text-xs text-slate-400 mt-1">此為簡易帳號系統，密碼以明碼儲存，請勿使用重要密碼</p>
          </div>
          <div className="form-group"><label className="form-label">顯示名稱</label><input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>
          {regError && <div className="auth-error">{regError}</div>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setView('menu')}>取消</button>
            <button type="submit" className="btn btn-primary flex-1">建立</button>
          </div>
        </form>
      )}

      {view === 'manage' && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">管理使用者</h3>
          {activeUsers.map(u => (
            <div key={u.id} className="flex items-center gap-2 py-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: u.color }} />
              {editingUserId === u.id ? (
                <>
                  <input className="form-input flex-1 !py-1" value={editingName} onChange={e => setEditingName(e.target.value)} autoFocus />
                  <button className="header-icon-btn" onClick={() => setEditingUserId(null)}><FontAwesomeIcon icon={faTimes} /></button>
                  <button className="header-icon-btn text-green-500" onClick={() => handleSaveName(u.id)}><FontAwesomeIcon icon={faCheck} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm cursor-pointer" onClick={() => { setEditingUserId(u.id); setEditingName(u.displayName) }}>{u.displayName}</span>
                  {u.id !== realAdminId && (u.id !== currentUser.id || !!adminSessionId) && (
                    <button className="header-icon-btn text-red-400" onClick={() => setConfirmDelete(u.id)}><FontAwesomeIcon icon={faTrash} /></button>
                  )}
                </>
              )}
            </div>
          ))}
          <button className="btn btn-secondary w-full mt-2" onClick={() => setView('menu')}>返回</button>

          {confirmDelete && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm mb-2">確定要刪除「{state.users.find(u => u.id === confirmDelete)?.displayName}」嗎？</p>
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1 btn-sm" onClick={() => setConfirmDelete(null)}>取消</button>
                <button className="btn btn-sm flex-1 bg-red-500 text-white" onClick={() => handleDeleteUser(confirmDelete)}>刪除</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'switch' && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">切換使用者</h3>
          {otherUsers.map(u => (
            <button key={u.id} className="btn btn-secondary w-full text-left flex items-center gap-2" onClick={() => handleSwitchUser(u)}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: u.color }} />
              {u.displayName}
            </button>
          ))}
          {otherUsers.length === 0 && <p className="text-sm text-slate-400 text-center py-2">沒有其他使用者</p>}
          <button className="btn btn-secondary w-full" onClick={() => setView('menu')}>返回</button>
        </div>
      )}

      {view === 'resetpw' && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">重置密碼</h3>
          {resetSuccess ? (
            <>
              <p className="text-sm text-slate-500 text-center">密碼已重置成功</p>
              <button className="btn btn-secondary w-full" onClick={() => setView('menu')}>返回</button>
            </>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (!newPassword) return; updateUser({ ...currentUser, password: newPassword }); setResetSuccess(true) }}>
              <div className="form-group">
                <label className="form-label">新密碼</label>
                <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus required />
                <p className="text-xs text-slate-400 mt-1">此為簡易帳號系統，密碼以明碼儲存，請勿使用重要密碼</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setView('menu')}>取消</button>
                <button type="submit" className="btn btn-primary flex-1">確認</button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}
