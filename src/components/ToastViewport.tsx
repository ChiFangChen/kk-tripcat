import { useApp } from "../context/AppContext";
import type { ToastMessage } from "../types/toast";

export function ToastViewport({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;

  return (
    <div
      className={`toast toast--${toast.type}`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}

export function ConnectedToastViewport() {
  const { toast } = useApp();
  return <ToastViewport toast={toast} />;
}
