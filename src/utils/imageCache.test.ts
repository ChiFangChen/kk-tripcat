import { describe, expect, it } from "vitest";
import { isFirebaseStorageImageUrl } from "./imageCache";

describe("image cache URL matching", () => {
  it("matches Firebase Storage download URLs", () => {
    expect(
      isFirebaseStorageImageUrl(
        "https://firebasestorage.googleapis.com/v0/b/example.appspot.com/o/tc-images%2Ftrips%2Ftrip-1%2Fimage.webp?alt=media&token=abc",
      ),
    ).toBe(true);
  });

  it("ignores non-Firebase image URLs", () => {
    expect(isFirebaseStorageImageUrl("https://files.local/image.jpg")).toBe(
      false,
    );
  });
});
