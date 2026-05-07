/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { LoadingImage } from "./LoadingImage";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

function renderLoadingImage() {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <LoadingImage
        src="https://files.local/image.jpg"
        alt=""
        width={320}
        height={240}
      />,
    );
  });

  return { root };
}

function renderLoadingImageWithoutDimensions() {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<LoadingImage src="https://files.local/image.jpg" alt="" />);
  });

  return { root };
}

describe("LoadingImage", () => {
  it("shows a shimmer skeleton with the image aspect ratio before load", () => {
    const { root } = renderLoadingImage();

    const frame = container!.querySelector(".loading-image-frame");
    const wrapper = container!.querySelector(".loading-image-wrapper");
    const skeleton = container!.querySelector(".loading-image-skeleton");
    const image = container!.querySelector("img");

    expect(wrapper).toHaveProperty("style.maxWidth", "320px");
    expect(frame).toBeTruthy();
    expect(frame).toHaveProperty("style.aspectRatio", "320 / 240");
    expect(skeleton).toBeTruthy();
    expect(image?.className).toContain("loading-image-img--hidden");

    act(() => root.unmount());
  });

  it("fades in the image and removes the skeleton after load", () => {
    const { root } = renderLoadingImage();
    const image = container!.querySelector("img")!;

    act(() => {
      image.dispatchEvent(new Event("load"));
    });

    expect(container!.querySelector(".loading-image-skeleton")).toBeNull();
    expect(image.className).toContain("loading-image-img--loaded");

    act(() => root.unmount());
  });

  it("does not show a skeleton when dimensions are unavailable", () => {
    const { root } = renderLoadingImageWithoutDimensions();

    expect(container!.querySelector(".loading-image-skeleton")).toBeNull();
    expect(
      container!.querySelector<HTMLElement>(".loading-image-frame")!.style
        .aspectRatio,
    ).toBe("");

    act(() => root.unmount());
  });
});
