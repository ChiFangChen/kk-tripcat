import { useState, type ChangeEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

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
  const [isVisible, setIsVisible] = useState(false)

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
        aria-label={isVisible ? '隱藏密碼' : '顯示密碼'}
        title={isVisible ? '隱藏密碼' : '顯示密碼'}
      >
        <FontAwesomeIcon icon={isVisible ? faEyeSlash : faEye} />
      </button>
    </div>
  )
}
