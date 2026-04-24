import type { ImageAsset, PendingImageFile } from "../types/images";

export type UploadPendingImage = PendingImageFile;

export function createPendingImages(
  files: File[],
  createImageId: () => string,
): PendingImageFile[] {
  return files.map((file) => ({
    file,
    imageId: createImageId(),
  }));
}

export async function compressImageFile(
  file: File,
  maxWidth = 800,
  quality = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxWidth / image.width, 1);
      canvas.width = image.width * ratio;
      canvas.height = image.height * ratio;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Image compression failed"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        quality,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };
    image.src = objectUrl;
  });
}

export function createStorageImagePath({
  basePath,
  imageId,
}: {
  basePath: string;
  imageId: string;
}): string {
  return `${basePath}/${imageId}.jpg`;
}

export async function uploadPendingImagesBatch({
  pendingImages,
  basePath,
  createdAt,
  upload,
  remove,
}: {
  pendingImages: UploadPendingImage[];
  basePath: string;
  createdAt: string;
  upload: (path: string, file: Blob) => Promise<string>;
  remove: (path: string) => Promise<void>;
}): Promise<ImageAsset[]> {
  const uploadedPaths: string[] = [];
  const assets: ImageAsset[] = [];

  try {
    for (const pendingImage of pendingImages) {
      const path = createStorageImagePath({
        basePath,
        imageId: pendingImage.imageId,
      });
      const file =
        pendingImage.file instanceof File
          ? await compressImageFile(pendingImage.file)
          : pendingImage.file;
      const url = await upload(path, file);
      uploadedPaths.push(path);
      assets.push({
        id: pendingImage.imageId,
        url,
        path,
        createdAt,
      });
    }

    return assets;
  } catch (error) {
    await Promise.all(uploadedPaths.map((path) => remove(path)));
    throw error;
  }
}

export async function copyImagesToNewPaths({
  images,
  targetBasePath,
  createImageId,
  createdAt,
  fetchBlob,
  upload,
  remove,
}: {
  images: ImageAsset[];
  targetBasePath: string;
  createImageId: () => string;
  createdAt: string;
  fetchBlob: (url: string) => Promise<Blob>;
  upload: (path: string, file: Blob) => Promise<string>;
  remove: (path: string) => Promise<void>;
}): Promise<ImageAsset[]> {
  const pendingImages = await Promise.all(
    images.map(async (image) => ({
      file: await fetchBlob(image.url),
      imageId: createImageId(),
    })),
  );

  return uploadPendingImagesBatch({
    pendingImages,
    basePath: targetBasePath,
    createdAt,
    upload,
    remove,
  });
}

export async function persistImagesForRecord({
  existingImages,
  pendingImages,
  removedImages,
  basePath,
  createdAt,
  upload,
  remove,
  onPersist,
}: {
  existingImages: ImageAsset[];
  pendingImages: UploadPendingImage[];
  removedImages: ImageAsset[];
  basePath: string;
  createdAt: string;
  upload: (path: string, file: Blob) => Promise<string>;
  remove: (path: string) => Promise<void>;
  onPersist: (images: ImageAsset[]) => Promise<void>;
}): Promise<ImageAsset[]> {
  const uploadedImages = await uploadPendingImagesBatch({
    pendingImages,
    basePath,
    createdAt,
    upload,
    remove,
  });

  const mergedImages = [...existingImages, ...uploadedImages];

  try {
    await onPersist(mergedImages);
  } catch (error) {
    await Promise.all(uploadedImages.map((image) => remove(image.path)));
    throw error;
  }

  await Promise.all(removedImages.map((image) => remove(image.path)));
  return mergedImages;
}
