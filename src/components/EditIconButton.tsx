import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  onClick: () => void;
  className?: string;
}

export function EditIconButton({ onClick, className = "" }: Props) {
  const { t } = useTranslation();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onClick();
  }

  return (
    <button
      type="button"
      className={`inline-edit-btn ${className}`.trim()}
      onClick={handleClick}
      title={t("common.edit")}
      aria-label={t("common.edit")}
    >
      <FontAwesomeIcon icon={faPen} />
    </button>
  );
}
