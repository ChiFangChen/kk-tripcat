/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ToastViewport } from "./ToastViewport";
import type { ToastMessage } from "../types/toast";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

function renderToast(toast: ToastMessage | null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<ToastViewport toast={toast} />);
  });

  return { root };
}

describe("ToastViewport", () => {
  it("renders the current toast as a live status message", () => {
    const { root } = renderToast({
      id: "toast-1",
      type: "error",
      message: "部分圖片刪除失敗",
    });

    const toast = container!.querySelector(".toast");

    expect(toast?.getAttribute("role")).toBe("status");
    expect(toast?.getAttribute("aria-live")).toBe("polite");
    expect(toast?.className).toContain("toast--error");
    expect(toast?.textContent).toBe("部分圖片刪除失敗");

    act(() => root.unmount());
  });

  it("renders nothing when there is no toast", () => {
    const { root } = renderToast(null);

    expect(container!.querySelector(".toast")).toBeNull();

    act(() => root.unmount());
  });
});
