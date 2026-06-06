import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { PasswordInput } from '../components/PasswordInput'
import { useTranslation } from 'react-i18next'
import type { GoogleAccount } from '../utils/firebase'

interface Props {
  onSwitchToRegister: () => void
}

export function Login({ onSwitchToRegister }: Props) {
  const { t } = useTranslation()
  const { state, login, updateUser, startGoogleLogin, bindGoogleAccount, createGoogleUser } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null)
  const [googleMode, setGoogleMode] = useState<'choice' | 'existing' | 'new'>('choice')
  const [googleDisplayName, setGoogleDisplayName] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
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
      (u) =>
        u.username === username &&
        u.password === password &&
        u.authProvider !== 'google' &&
        !u.deleted
    )
    if (user) {
      login(user)
    } else {
      setError('auth.errors.invalidLogin')
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const result = await startGoogleLogin()
      if (result.status === 'unlinked') {
        setGoogleAccount(result.googleAccount)
        setGoogleDisplayName(result.googleAccount.displayName || '')
        setGoogleMode('choice')
      }
    } catch {
      setError('auth.errors.googleLoginFailed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleExistingGoogleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!googleAccount) return
    setError('')
    const user = state.users.find(
      (u) =>
        u.username === username &&
        u.password === password &&
        u.authProvider !== 'google' &&
        !u.deleted
    )
    if (!user) {
      setError('auth.errors.invalidLogin')
      return
    }
    try {
      const linkedUser = await bindGoogleAccount(user, googleAccount)
      login(linkedUser)
    } catch {
      setError('auth.errors.googleAlreadyLinked')
    }
  }

  const handleCreateGoogleUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!googleAccount) return
    setError('')
    if (!googleDisplayName.trim()) {
      setError('auth.errors.missingDisplayName')
      return
    }
    try {
      await createGoogleUser(googleAccount, googleDisplayName)
    } catch {
      setError('auth.errors.createFailed')
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

      {googleAccount ? (
        <div className="auth-form">
          {googleMode === 'choice' && (
            <>
              <p className="text-sm text-slate-500 text-center">
                {t('auth.googleUnlinked', { email: googleAccount.email })}
              </p>
              <button className="btn btn-primary w-full" onClick={() => setGoogleMode('existing')}>
                {t('auth.linkExistingAccount')}
              </button>
              <button className="btn btn-secondary w-full" onClick={() => setGoogleMode('new')}>
                {t('auth.createGoogleAccount')}
              </button>
              <button className="btn-link" onClick={() => { setGoogleAccount(null); setError('') }}>
                {t('common.cancel')}
              </button>
            </>
          )}
          {googleMode === 'existing' && (
            <form onSubmit={handleExistingGoogleLink} className="auth-form !w-full">
              <p className="text-sm text-slate-500 text-center">{t('auth.googleLinkPasswordDisabled')}</p>
              <div className="form-group"><label className="form-label">{t('auth.username')}</label><input className="form-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" required /></div>
              <div className="form-group"><label className="form-label">{t('auth.password')}</label><PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" required /></div>
              {error && <div className="auth-error">{t(error)}</div>}
              <button type="submit" className="btn btn-primary w-full">{t('auth.linkGoogleAccount')}</button>
              <button type="button" className="btn-link" onClick={() => { setGoogleMode('choice'); setError('') }}>{t('common.back')}</button>
            </form>
          )}
          {googleMode === 'new' && (
            <form onSubmit={handleCreateGoogleUser} className="auth-form !w-full">
              <p className="text-sm text-slate-500 text-center">{googleAccount.email}</p>
              <div className="form-group"><label className="form-label">{t('auth.displayName')}</label><input className="form-input" value={googleDisplayName} onChange={e => setGoogleDisplayName(e.target.value)} autoComplete="off" required /></div>
              {error && <div className="auth-error">{t(error)}</div>}
              <button type="submit" className="btn btn-primary w-full">{t('auth.createAccount')}</button>
              <button type="button" className="btn-link" onClick={() => { setGoogleMode('choice'); setError('') }}>{t('common.back')}</button>
            </form>
          )}
        </div>
      ) : showForgot ? (
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
          <button className="btn btn-secondary w-full max-w-xs" onClick={handleGoogleLogin} disabled={googleLoading}>
            {googleLoading ? t('common.loading') : t('auth.loginWithGoogle')}
          </button>
          <button className="btn-link" onClick={onSwitchToRegister}>{t('auth.switchToRegister')}</button>
        </>
      )}
    </div>
  )
}
