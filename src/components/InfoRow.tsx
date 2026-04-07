import type { ReactNode } from 'react'

interface Props {
  label: string
  value?: string | ReactNode
  isLink?: boolean
}

export function InfoRow({ label, value, isLink }: Props) {
  if (!value) return null

  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      {isLink && typeof value === 'string' ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sky-500 break-all">
          {value}
        </a>
      ) : (
        <span className="break-all">{value}</span>
      )}
    </div>
  )
}
