import { describe, expect, it } from "vitest";
import { deleteImagePathWithRetry, deleteImagePathsWithRetry } from "./imageDelete";

describe("image delete retry", () => {
  it("retries a failed image delete up to 3 attempts and succeeds", async () => {
    let attempts = 0;

    const deleted = await deleteImagePathWithRetry("images/a.jpg", async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("temporary failure");
      }
    });

    expect(deleted).toBe(true);
    expect(attempts).toBe(3);
  });

  it("returns false after 3 failed delete attempts", async () => {
    let attempts = 0;

    const deleted = await deleteImagePathWithRetry("images/a.jpg", async () => {
      attempts += 1;
      throw new Error("storage failure");
    });

    expect(deleted).toBe(false);
    expect(attempts).toBe(3);
  });

  it("returns only paths that still failed after retries", async () => {
    const attemptsByPath: Record<string, number> = {};

    const failedPaths = await deleteImagePathsWithRetry(
      ["images/a.jpg", "images/b.jpg"],
      async (path) => {
        attemptsByPath[path] = (attemptsByPath[path] || 0) + 1;
        if (path === "images/a.jpg") return;
        throw new Error("storage failure");
      },
    );

    expect(failedPaths).toEqual(["images/b.jpg"]);
    expect(attemptsByPath["images/a.jpg"]).toBe(1);
    expect(attemptsByPath["images/b.jpg"]).toBe(3);
  });
});
