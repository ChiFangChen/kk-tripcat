interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  title?: string;
}

export function SwitchControl({ checked, onChange, ariaLabel, title }: Props) {
  return (
    <label className="switch-control" title={title}>
      <input
        className="switch-control-input"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        aria-label={ariaLabel}
      />
      <span className="switch-control-track" aria-hidden="true">
        <span className="switch-control-thumb" />
      </span>
    </label>
  );
}
