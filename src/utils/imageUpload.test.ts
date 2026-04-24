import { describe, expect, it, vi } from "vitest";
import {
  copyImagesToNewPaths,
  createStorageImagePath,
  persistImagesForRecord,
  uploadPendingImagesBatch,
  type UploadPendingImage,
} from "./imageUpload";

describe("createStorageImagePath", () => {
  it("builds deterministic jpg storage paths", () => {
    expect(
      createStorageImagePath({
        basePath: "tc-images/trips/trip-1/hotels/hotel-1",
        imageId: "img-1",
      }),
    ).toBe("tc-images/trips/trip-1/hotels/hotel-1/img-1.jpg");
  });
});

describe("uploadPendingImagesBatch", () => {
  it("uploads every pending image and returns image assets", async () => {
    const upload = vi
      .fn<(path: string, file: Blob) => Promise<string>>()
      .mockImplementation(async (path) => `https://files.local/${path}`);
    const remove = vi.fn<(path: string) => Promise<void>>().mockResolvedValue();

    const pendingImages: UploadPendingImage[] = [
      { file: new Blob(["a"]), imageId: "img-1" },
      { file: new Blob(["b"]), imageId: "img-2" },
    ];

    const uploaded = await uploadPendingImagesBatch({
      pendingImages,
      basePath: "tc-images/trips/trip-1/hotels/hotel-1",
      createdAt: "2026-04-25T10:00:00.000Z",
      upload,
      remove,
    });

    expect(uploaded).toEqual([
      {
        id: "img-1",
        url: "https://files.local/tc-images/trips/trip-1/hotels/hotel-1/img-1.jpg",
        path: "tc-images/trips/trip-1/hotels/hotel-1/img-1.jpg",
        createdAt: "2026-04-25T10:00:00.000Z",
      },
      {
        id: "img-2",
        url: "https://files.local/tc-images/trips/trip-1/hotels/hotel-1/img-2.jpg",
        path: "tc-images/trips/trip-1/hotels/hotel-1/img-2.jpg",
        createdAt: "2026-04-25T10:00:00.000Z",
      },
    ]);
    expect(remove).not.toHaveBeenCalled();
  });

  it("rolls back already uploaded files when a later upload fails", async () => {
    const upload = vi
      .fn<(path: string, file: Blob) => Promise<string>>()
      .mockImplementation(async (path) => {
        if (path.endsWith("img-2.jpg")) {
          throw new Error("upload failed");
        }
        return `https://files.local/${path}`;
      });
    const remove = vi.fn<(path: string) => Promise<void>>().mockResolvedValue();

    await expect(
      uploadPendingImagesBatch({
        pendingImages: [
          { file: new Blob(["a"]), imageId: "img-1" },
          { file: new Blob(["b"]), imageId: "img-2" },
        ],
        basePath: "tc-images/trips/trip-1/hotels/hotel-1",
        createdAt: "2026-04-25T10:00:00.000Z",
        upload,
        remove,
      }),
    ).rejects.toThrow("upload failed");

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(
      "tc-images/trips/trip-1/hotels/hotel-1/img-1.jpg",
    );
  });
});

describe("copyImagesToNewPaths", () => {
  it("copies images to new paths and returns new image metadata", async () => {
    const fetchBlob = vi
      .fn<(url: string) => Promise<Blob>>()
      .mockResolvedValue(new Blob(["copied"]));
    const upload = vi
      .fn<(path: string, file: Blob) => Promise<string>>()
      .mockImplementation(async (path) => `https://files.local/${path}`);
    const remove = vi.fn<(path: string) => Promise<void>>().mockResolvedValue();

    const copied = await copyImagesToNewPaths({
      images: [
        {
          id: "img-old",
          url: "https://files.local/source.jpg",
          path: "tc-images/trips/trip-1/shopping/item-1/source.jpg",
          createdAt: "2026-04-24T10:00:00.000Z",
        },
      ],
      targetBasePath: "tc-images/users/admin-1/items/item-1",
      createImageId: () => "img-new",
      createdAt: "2026-04-25T10:00:00.000Z",
      fetchBlob,
      upload,
      remove,
    });

    expect(copied).toEqual([
      {
        id: "img-new",
        url: "https://files.local/tc-images/users/admin-1/items/item-1/img-new.jpg",
        path: "tc-images/users/admin-1/items/item-1/img-new.jpg",
        createdAt: "2026-04-25T10:00:00.000Z",
      },
    ]);
  });
});

describe("persistImagesForRecord", () => {
  it("persists merged images then deletes removed paths", async () => {
    const upload = vi
      .fn<(path: string, file: Blob) => Promise<string>>()
      .mockImplementation(async (path) => `https://files.local/${path}`);
    const remove = vi.fn<(path: string) => Promise<void>>().mockResolvedValue();
    const onPersist = vi
      .fn<(images: unknown) => Promise<void>>()
      .mockResolvedValue();

    await persistImagesForRecord({
      existingImages: [
        {
          id: "img-existing",
          url: "https://files.local/existing.jpg",
          path: "tc-images/trips/trip-1/hotels/hotel-1/img-existing.jpg",
          createdAt: "2026-04-24T10:00:00.000Z",
        },
      ],
      pendingImages: [{ file: new Blob(["a"]), imageId: "img-new" }],
      removedImages: [
        {
          id: "img-removed",
          url: "https://files.local/removed.jpg",
          path: "tc-images/trips/trip-1/hotels/hotel-1/img-removed.jpg",
          createdAt: "2026-04-24T10:00:00.000Z",
        },
      ],
      basePath: "tc-images/trips/trip-1/hotels/hotel-1",
      createdAt: "2026-04-25T10:00:00.000Z",
      upload,
      remove,
      onPersist,
    });

    expect(onPersist).toHaveBeenCalledWith([
      {
        id: "img-existing",
        url: "https://files.local/existing.jpg",
        path: "tc-images/trips/trip-1/hotels/hotel-1/img-existing.jpg",
        createdAt: "2026-04-24T10:00:00.000Z",
      },
      {
        id: "img-new",
        url: "https://files.local/tc-images/trips/trip-1/hotels/hotel-1/img-new.jpg",
        path: "tc-images/trips/trip-1/hotels/hotel-1/img-new.jpg",
        createdAt: "2026-04-25T10:00:00.000Z",
      },
    ]);
    expect(remove).toHaveBeenCalledWith(
      "tc-images/trips/trip-1/hotels/hotel-1/img-removed.jpg",
    );
  });

  it("rolls back new uploads if persisting the record fails", async () => {
    const upload = vi
      .fn<(path: string, file: Blob) => Promise<string>>()
      .mockImplementation(async (path) => `https://files.local/${path}`);
    const remove = vi.fn<(path: string) => Promise<void>>().mockResolvedValue();

    await expect(
      persistImagesForRecord({
        existingImages: [],
        pendingImages: [{ file: new Blob(["a"]), imageId: "img-new" }],
        removedImages: [],
        basePath: "tc-images/trips/trip-1/hotels/hotel-1",
        createdAt: "2026-04-25T10:00:00.000Z",
        upload,
        remove,
        onPersist: async () => {
          throw new Error("save failed");
        },
      }),
    ).rejects.toThrow("save failed");

    expect(remove).toHaveBeenCalledWith(
      "tc-images/trips/trip-1/hotels/hotel-1/img-new.jpg",
    );
  });
});
