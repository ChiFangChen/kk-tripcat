import type { ReactNode } from "react";

interface Props {
  label: string;
  value?: string | ReactNode;
  isLink?: boolean;
}

export function InfoRow({ label, value, isLink }: Props) {
  if (!value) return null;

  return (
    <div className="info-row">
      <div className="info-label">{label}</div>
      {isLink && typeof value === "string" ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="info-value text-sky-500 break-all"
        >
          {value}
        </a>
      ) : (
        <div className="info-value break-all whitespace-pre-wrap">{value}</div>
      )}
    </div>
  );
}
