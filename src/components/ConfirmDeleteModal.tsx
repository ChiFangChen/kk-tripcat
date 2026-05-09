import { Modal } from "./Modal";

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
  confirmLabel = "刪除",
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm mb-4">{message}</p>
      <div className="flex gap-2">
        <button className="btn btn-secondary flex-1" onClick={onCancel}>
          取消
        </button>
        <button
          className="btn btn-secondary btn-danger flex-1"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
