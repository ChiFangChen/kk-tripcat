import { describe, expect, it } from "vitest";
import {
  galleryImageClassName,
  getImageAspectRatio,
  shoppingThumbnailClassName,
} from "./imageDisplayClasses";

describe("image display class names", () => {
  it("keeps gallery images uncropped, constrained to container width, and centered", () => {
    expect(galleryImageClassName).toContain("max-w-full");
    expect(galleryImageClassName).toContain("w-auto");
    expect(galleryImageClassName).toContain("h-auto");
    expect(galleryImageClassName).toContain("mx-auto");
    expect(galleryImageClassName).toContain("object-contain");
    expect(galleryImageClassName).not.toContain("object-cover");
  });

  it("uses fixed-width proportional thumbnails for shopping rows", () => {
    expect(shoppingThumbnailClassName).toContain("w-8");
    expect(shoppingThumbnailClassName).toContain("h-auto");
    expect(shoppingThumbnailClassName).not.toContain("h-8");
    expect(shoppingThumbnailClassName).not.toContain("object-cover");
  });

  it("builds aspect ratios from image dimensions with a stable fallback", () => {
    expect(getImageAspectRatio({ width: 320, height: 240 })).toBe("320 / 240");
    expect(getImageAspectRatio({ width: 0, height: 0 })).toBe("4 / 3");
  });
});
