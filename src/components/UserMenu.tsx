import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSync, faTrash, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../context/AppContext'
import { PasswordInput } from './PasswordInput'
import { useTranslation } from 'react-i18next'

interface Props {
  onClose: () => void
  onSwitchUser?: () => void
}

const ADMIN_SESSION_KEY = 'kk-tripcat-admin-session'

export function UserMenu({ onClose, onSwitchUser }: Props) {
  const { t } = useTranslation()
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
    if (!username.trim()) { setRegError('auth.errors.missingUsername'); return }
    if (state.users.some(u => u.username === username && !u.deleted)) { setRegError('auth.errors.usernameExists'); return }
    try {
      await register(username, password, displayName || username)
      setUsername(''); setPassword(''); setDisplayName('')
      setView('menu')
    } catch {
      setRegError('auth.errors.createFailed')
    }
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
  const deleteTarget = confirmDelete ? state.users.find(u => u.id === confirmDelete) : null

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        {view === 'menu' && (
          <>
            <div className="user-menu-header">
              <h3>{currentUser.displayName}</h3>
              <label className="color-picker-btn" style={{ backgroundColor: currentUser.color }}>
                <FontAwesomeIcon icon={faSync} className="color-picker-icon" />
                <input
                  type="color"
                  value={currentUser.color || '#888888'}
                  onChange={e => handleColorChange(e.target.value)}
                  className="color-input-hidden"
                />
              </label>
            </div>

            {adminSessionId && (
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSwitchBackToAdmin}>{t('userMenu.returnToAdmin')}</button>
            )}
            {isAdminSession && <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setView('manage')}>{t('userMenu.manageUsers')}</button>}
            {isAdminSession && <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setView('register')}>{t('userMenu.addUser')}</button>}
            {isAdminSession && <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setView('switch')}>{t('userMenu.switchUser')}</button>}
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setNewPassword(''); setResetSuccess(false); setView('resetpw') }}>{t('auth.resetPassword')}</button>
            <button className="btn w-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" onClick={() => {
              localStorage.removeItem(ADMIN_SESSION_KEY)
              localStorage.removeItem('kk-tripcat-route-trip')
              onSwitchUser?.()
              logout()
            }}>{t('auth.logout')}</button>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>{t('common.close')}</button>
          </>
        )}

        {view === 'register' && (
          <>
            <h3 style={{ fontWeight: 600 }}>{t('userMenu.addUser')}</h3>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="form-group"><label className="form-label">{t('auth.username')}</label><input className="form-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" autoFocus required /></div>
              <div className="form-group">
                <label className="form-label">{t('auth.password')}</label><PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" required />
                <p className="text-xs text-slate-400 mt-1">{t('auth.passwordWarning')}</p>
              </div>
              <div className="form-group"><label className="form-label">{t('auth.displayName')}</label><input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>
              {regError && <div className="auth-error">{t(regError)}</div>}
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setView('menu')}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary flex-1">{t('common.create')}</button>
              </div>
            </form>
          </>
        )}

        {view === 'manage' && (
          <>
            <h3 style={{ fontWeight: 600 }}>{t('userMenu.manageUsers')}</h3>
            <div className="member-list-settings">
              {activeUsers.map(u => (
                <div key={u.id} className="member-row">
                  <span className="color-dot" style={{ backgroundColor: u.color, marginRight: '0.5rem' }} />
                  {editingUserId === u.id ? (
                    <>
                      <input className="form-input flex-1 !py-1" value={editingName} onChange={e => setEditingName(e.target.value)} autoFocus />
                      <button className="header-icon-btn" onClick={() => setEditingUserId(null)}><FontAwesomeIcon icon={faTimes} /></button>
                      <button className="header-icon-btn text-green-500" onClick={() => handleSaveName(u.id)}><FontAwesomeIcon icon={faCheck} /></button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, cursor: 'pointer', fontSize: '0.875rem' }} onClick={() => { setEditingUserId(u.id); setEditingName(u.displayName) }}>{u.displayName}</span>
                      {u.id !== realAdminId && (u.id !== currentUser.id || !!adminSessionId) && (
                        <button className="header-icon-btn text-red-400" onClick={() => setConfirmDelete(u.id)}><FontAwesomeIcon icon={faTrash} /></button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setView('menu')}>{t('common.back')}</button>

            {confirmDelete && deleteTarget && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm mb-2">{t('userMenu.deleteUserConfirm', { name: deleteTarget.displayName })}</p>
                <div className="flex gap-2">
                  <button className="btn btn-secondary flex-1 btn-sm" onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</button>
                  <button className="btn btn-sm flex-1 bg-red-500 text-white" onClick={() => handleDeleteUser(confirmDelete)}>{t('common.delete')}</button>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'switch' && (
          <>
            <h3 style={{ fontWeight: 600 }}>{t('userMenu.switchUser')}</h3>
            <div className="member-list-settings">
              {otherUsers.map(u => (
                <button key={u.id} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center' }} onClick={() => handleSwitchUser(u)}>
                  <span className="color-dot" style={{ backgroundColor: u.color, marginRight: '0.5rem' }} />
                  {u.displayName}
                </button>
              ))}
              {otherUsers.length === 0 && <p className="text-sm text-slate-400 text-center py-2">{t('userMenu.noOtherUsers')}</p>}
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setView('menu')}>{t('common.back')}</button>
          </>
        )}

        {view === 'resetpw' && (
          <>
            <h3 style={{ fontWeight: 600 }}>{t('auth.resetPassword')}</h3>
            {resetSuccess ? (
              <>
                <p className="text-sm text-slate-500 text-center">{t('auth.passwordResetSuccess')}</p>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setView('menu')}>{t('common.back')}</button>
              </>
            ) : (
              <form onSubmit={e => { e.preventDefault(); if (!newPassword) return; updateUser({ ...currentUser, password: newPassword }); setResetSuccess(true) }}>
                <div className="form-group">
                  <label className="form-label">{t('auth.newPassword')}</label>
                  <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus required />
                  <p className="text-xs text-slate-400 mt-1">{t('auth.passwordWarning')}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-secondary flex-1" onClick={() => setView('menu')}>{t('common.cancel')}</button>
                  <button type="submit" className="btn btn-primary flex-1">{t('common.confirm')}</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
