/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;

beforeEach(() => {
  Object.defineProperty(window, "scrollTo", {
    value: vi.fn(),
    writable: true,
  });
});

afterEach(() => {
  container?.remove();
  container = null;
});

function renderModal(onConfirm = vi.fn(), onClose = vi.fn()) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <ConfirmDeleteModal
        title="刪除航班"
        message="確定要刪除這筆航班嗎？"
        onCancel={onClose}
        onConfirm={onConfirm}
      />,
    );
  });

  return { root, onConfirm, onClose };
}

describe("ConfirmDeleteModal", () => {
  it("requires an explicit confirmation before running the delete action", () => {
    const { root, onConfirm, onClose } = renderModal();

    expect(container!.textContent).toContain("確定要刪除這筆航班嗎？");
    expect(onConfirm).not.toHaveBeenCalled();

    const deleteButton = Array.from(container!.querySelectorAll("button")).find(
      (button) => button.textContent === "刪除",
    )!;
    act(() => {
      deleteButton.click();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
