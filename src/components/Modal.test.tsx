// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = vi.fn();

function NestedModalHarness() {
  const [parentOpen, setParentOpen] = useState(true);
  const [childOpen, setChildOpen] = useState(true);

  return (
    <>
      {parentOpen && (
        <Modal title="Parent" onClose={() => setParentOpen(false)}>
          Parent content
        </Modal>
      )}
      {childOpen && (
        <Modal title="Child" onClose={() => setChildOpen(false)}>
          <button
            onClick={() => {
              setParentOpen(false);
              setChildOpen(false);
            }}
          >
            Close all
          </button>
        </Modal>
      )}
    </>
  );
}

describe("Modal", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.body.removeAttribute("style");
    document.documentElement.removeAttribute("style");
    vi.clearAllMocks();
  });

  it("unlocks the page when stacked modals close in the same update", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<NestedModalHarness />);
    });

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent === "Close all")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.querySelector(".modal-overlay")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.touchAction).toBeFalsy();
    expect(document.body.style.position).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });
});
