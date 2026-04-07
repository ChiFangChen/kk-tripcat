interface Props {
  label: string
  value?: string
  isLink?: boolean
}

export function InfoRow({ label, value, isLink }: Props) {
  if (!value) return null

  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sky-500 break-all">
          {value}
        </a>
      ) : (
        <span className="break-all">{value}</span>
      )}
    </div>
  )
}
