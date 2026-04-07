import type { ReactNode } from 'react'

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
        <span className={`accordion-chevron ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  )
}
