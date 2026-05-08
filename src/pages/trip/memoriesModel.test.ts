import { describe, expect, it } from "vitest";
import type { MemoryPost } from "../../types";
import {
  canDeleteMemoryEntry,
  canEditMemoryEntry,
  canSaveMemoryEntry,
  getMemoryPostImagePaths,
  sortMemoryPosts,
} from "./memoriesModel";

const postA: MemoryPost = {
  id: "post-a",
  title: "A",
  content: "old",
  images: [],
  authorId: "user-1",
  comments: [],
  createdAt: "2026-05-07T10:00:00.000Z",
  updatedAt: "2026-05-07T10:00:00.000Z",
};

const postB: MemoryPost = {
  ...postA,
  id: "post-b",
  content: "new",
  createdAt: "2026-05-08T10:00:00.000Z",
  updatedAt: "2026-05-08T10:00:00.000Z",
};

describe("memoriesModel", () => {
  it("allows saving when content or images exist", () => {
    expect(canSaveMemoryEntry({ content: "  hello  ", images: [] })).toBe(
      true,
    );
    expect(
      canSaveMemoryEntry({
        content: "  ",
        images: [
          {
            id: "image-1",
            url: "https://files.local/image.jpg",
            path: "images/image.jpg",
            createdAt: "2026-05-08T00:00:00.000Z",
            width: 320,
            height: 240,
          },
        ],
      }),
    ).toBe(true);
    expect(canSaveMemoryEntry({ content: "  ", images: [] })).toBe(false);
  });

  it("sorts posts newest first", () => {
    expect(sortMemoryPosts([postA, postB]).map((post) => post.id)).toEqual([
      "post-b",
      "post-a",
    ]);
  });

  it("allows authors to edit only their own entries", () => {
    expect(canEditMemoryEntry({ authorId: "user-1" }, "user-1")).toBe(true);
    expect(canEditMemoryEntry({ authorId: "user-1" }, "user-2")).toBe(false);
    expect(canEditMemoryEntry({ authorId: "user-1" }, null)).toBe(false);
  });

  it("allows admins to delete any entry and authors to delete their own", () => {
    expect(
      canDeleteMemoryEntry({ authorId: "user-1" }, "user-1", false),
    ).toBe(true);
    expect(
      canDeleteMemoryEntry({ authorId: "user-1" }, "user-2", true),
    ).toBe(true);
    expect(
      canDeleteMemoryEntry({ authorId: "user-1" }, "user-2", false),
    ).toBe(false);
  });

  it("collects post image paths for deletion", () => {
    expect(
      getMemoryPostImagePaths({
        ...postA,
        images: [
          {
            id: "image-1",
            url: "https://files.local/image.jpg",
            path: "images/image.jpg",
            createdAt: "2026-05-08T00:00:00.000Z",
            width: 320,
            height: 240,
          },
        ],
      }),
    ).toEqual(["images/image.jpg"]);
  });
});
