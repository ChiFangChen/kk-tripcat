import { Modal } from "./Modal";
import { useTranslation } from "react-i18next";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  title,
  message,
  confirmLabel = "common.delete",
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm mb-4">{message}</p>
      <div className="flex gap-2">
        <button className="btn btn-secondary flex-1" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button
          className="btn btn-secondary btn-danger flex-1"
          onClick={onConfirm}
        >
          {t(confirmLabel)}
        </button>
      </div>
    </Modal>
  );
}
