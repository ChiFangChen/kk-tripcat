import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { PasswordInput } from '../components/PasswordInput'
import { useTranslation } from 'react-i18next'

interface Props {
  onSwitchToRegister: () => void
}

export function Login({ onSwitchToRegister }: Props) {
  const { t } = useTranslation()
  const { state, login, updateUser } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotUsername, setForgotUsername] = useState('')
  const [forgotDisplayName, setForgotDisplayName] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const user = state.users.find(
      (u) => u.username === username && u.password === password && !u.deleted
    )
    if (user) {
      login(user)
    } else {
      setError('auth.errors.invalidLogin')
    }
  }

  const handleLogoTap = () => {
    tapCountRef.current++
    clearTimeout(tapTimerRef.current)
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0
      setShowForgot(true)
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0 }, 1500)
    }
  }

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    const user = state.users.find(
      (u) => u.username === forgotUsername && u.displayName === forgotDisplayName && !u.deleted
    )
    if (!user) { setForgotError('auth.errors.invalidUsernameOrDisplayName'); return }
    if (!forgotNewPassword) { setForgotError('auth.errors.missingNewPassword'); return }
    updateUser({ ...user, password: forgotNewPassword })
    setForgotSuccess(true)
  }

  return (
    <div className="identity-page">
      <div className="login-logo" onClick={handleLogoTap}>🐱</div>
      <h1 className="identity-title">KK TripCat</h1>
      <p className="identity-subtitle">{t('auth.brandSubtitle')}</p>

      {showForgot ? (
        forgotSuccess ? (
          <div className="auth-form">
            <p className="text-sm text-slate-500 text-center">{t('auth.passwordResetSuccess')}</p>
            <button type="button" className="btn btn-primary w-full" onClick={() => {
              setShowForgot(false); setForgotSuccess(false)
              setForgotUsername(''); setForgotDisplayName(''); setForgotNewPassword('')
            }}>{t('auth.backToLogin')}</button>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="auth-form">
            <div className="form-group"><label className="form-label">{t('auth.username')}</label><input className="form-input" value={forgotUsername} onChange={e => setForgotUsername(e.target.value)} autoComplete="off" required /></div>
            <div className="form-group"><label className="form-label">{t('auth.displayName')}</label><input className="form-input" value={forgotDisplayName} onChange={e => setForgotDisplayName(e.target.value)} autoComplete="off" required /></div>
            <div className="form-group">
              <label className="form-label">{t('auth.newPassword')}</label>
              <PasswordInput value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} autoComplete="off" required />
              <p className="text-xs text-slate-400 mt-1">{t('auth.passwordWarning')}</p>
            </div>
            {forgotError && <div className="auth-error">{t(forgotError)}</div>}
            <button type="submit" className="btn btn-primary w-full">{t('auth.resetPassword')}</button>
            <button type="button" className="btn-link" onClick={() => { setShowForgot(false); setForgotError('') }}>{t('auth.backToLogin')}</button>
          </form>
        )
      ) : (
        <>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group"><label className="form-label">{t('auth.username')}</label><input className="form-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" required /></div>
            <div className="form-group"><label className="form-label">{t('auth.password')}</label><PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" required /></div>
            {error && <div className="auth-error">{t(error)}</div>}
            <button type="submit" className="btn btn-primary w-full">{t('auth.login')}</button>
          </form>
          <button className="btn-link" onClick={onSwitchToRegister}>{t('auth.switchToRegister')}</button>
        </>
      )}
    </div>
  )
}
