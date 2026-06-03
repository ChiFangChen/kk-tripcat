import { useState, type ChangeEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'

interface PasswordInputProps {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  autoComplete?: string
  autoFocus?: boolean
  required?: boolean
}

export function PasswordInput({
  value,
  onChange,
  autoComplete,
  autoFocus,
  required,
}: PasswordInputProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const visibilityLabel = isVisible ? t('auth.hidePassword') : t('auth.showPassword')

  return (
    <div className="password-input-wrapper">
      <input
        className="form-input password-input"
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={visibilityLabel}
        title={visibilityLabel}
      >
        <FontAwesomeIcon icon={isVisible ? faEyeSlash : faEye} />
      </button>
    </div>
  )
}
