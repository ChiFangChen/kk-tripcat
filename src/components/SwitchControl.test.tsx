/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SwitchControl } from "./SwitchControl";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

function renderSwitch(checked: boolean, onChange = vi.fn()) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <SwitchControl
        checked={checked}
        onChange={onChange}
        ariaLabel="公開記錄"
        title="公開記錄"
      />,
    );
  });

  return { root, onChange };
}

describe("SwitchControl", () => {
  it("renders a switch-shaped checkbox without visible label text", () => {
    const { root } = renderSwitch(true);

    const input = container!.querySelector<HTMLInputElement>(
      ".switch-control-input",
    );

    expect(input?.checked).toBe(true);
    expect(input?.getAttribute("aria-label")).toBe("公開記錄");
    expect(container!.querySelector(".switch-control-track")).toBeTruthy();
    expect(container!.querySelector(".switch-control-thumb")).toBeTruthy();
    expect(container!.textContent).toBe("");

    act(() => root.unmount());
  });

  it("reports the next checked value when toggled", () => {
    const { root, onChange } = renderSwitch(false);
    const input = container!.querySelector<HTMLInputElement>(
      ".switch-control-input",
    )!;

    act(() => {
      input.click();
    });

    expect(onChange).toHaveBeenCalledWith(true);

    act(() => root.unmount());
  });
});
