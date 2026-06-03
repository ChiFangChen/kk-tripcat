import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PasswordInput } from '../components/PasswordInput'
import { useTranslation } from 'react-i18next'

interface Props {
  onSwitchToLogin: () => void
}

export function Register({ onSwitchToLogin }: Props) {
  const { t } = useTranslation()
  const { state, register, login } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (state.users.some(u => u.username === username && !u.deleted)) {
      setError('auth.errors.usernameExists')
      return
    }
    try {
      const user = await register(username, password, displayName || username)
      login(user)
    } catch {
      setError('auth.errors.createFailed')
    }
  }

  return (
    <div className="identity-page">
      <div className="login-logo">🐱</div>
      <h1 className="identity-title">{t('auth.createAccount')}</h1>
      <p className="identity-subtitle">{t('auth.joinTripCat')}</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group"><label className="form-label">{t('auth.username')}</label><input className="form-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" required /></div>
        <div className="form-group">
          <label className="form-label">{t('auth.password')}</label>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" required />
          <p className="text-xs text-slate-400 mt-1">{t('auth.passwordWarning')}</p>
        </div>
        <div className="form-group"><label className="form-label">{t('auth.displayName')}</label><input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>
        {error && <div className="auth-error">{t(error)}</div>}
        <button type="submit" className="btn btn-primary w-full">{t('auth.createAccount')}</button>
      </form>

      <button className="btn-link" onClick={onSwitchToLogin}>{t('auth.switchToLogin')}</button>
    </div>
  )
}
