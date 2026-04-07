import type { ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

interface Props {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}

export function Accordion({ title, isOpen, onToggle, children }: Props) {
  return (
    <div>
      <div className={`accordion-header ${isOpen ? 'open' : ''}`} onClick={onToggle}>
        <span>{title}</span>
        <FontAwesomeIcon icon={faChevronDown} className={`accordion-chevron text-xs ${isOpen ? 'open' : ''}`} />
      </div>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  )
}
