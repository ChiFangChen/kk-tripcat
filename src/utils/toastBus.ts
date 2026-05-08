import type { ToastType } from "../types/toast";

export type GlobalToastRequest = {
  type?: ToastType;
  message: string;
};

let globalToastListener: ((toast: GlobalToastRequest) => void) | null = null;

export function subscribeGlobalToast(
  listener: (toast: GlobalToastRequest) => void,
): () => void {
  globalToastListener = listener;

  return () => {
    if (globalToastListener === listener) {
      globalToastListener = null;
    }
  };
}

export function emitGlobalToast(toast: GlobalToastRequest) {
  globalToastListener?.(toast);
}
