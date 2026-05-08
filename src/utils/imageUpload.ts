import type {
  ImageAsset,
  PendingImageFile,
  PreparedImageFile,
} from "../types/images";

export type UploadPendingImage = PendingImageFile;
type ImageExtension = NonNullable<PreparedImageFile["extension"]>;

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
): Promise<PreparedImageFile> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = async () => {
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

      try {
        const webpBlob = await canvasToBlob(canvas, "image/webp", quality);
        if (webpBlob?.type === "image/webp") {
          URL.revokeObjectURL(objectUrl);
          resolve({
            blob: webpBlob,
            width: canvas.width,
            height: canvas.height,
            extension: "webp",
          });
          return;
        }

        const jpegBlob = await canvasToBlob(canvas, "image/jpeg", quality);
        URL.revokeObjectURL(objectUrl);
        if (!jpegBlob) {
          reject(new Error("Image compression failed"));
          return;
        }

        resolve({
          blob: jpegBlob,
          width: canvas.width,
          height: canvas.height,
          extension: "jpg",
        });
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/jpeg" | "image/webp",
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function isPreparedImageFile(
  file: Blob | PreparedImageFile,
): file is PreparedImageFile {
  return "blob" in file;
}

function prepareImageForUpload(
  file: Blob | PreparedImageFile,
): PreparedImageFile {
  if (isPreparedImageFile(file)) return file;
  return {
    blob: file,
    width: 0,
    height: 0,
  };
}

export function createStorageImagePath({
  basePath,
  imageId,
  extension = "jpg",
}: {
  basePath: string;
  imageId: string;
  extension?: ImageExtension;
}): string {
  return `${basePath}/${imageId}.${extension}`;
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
      const file = prepareImageForUpload(
        pendingImage.file instanceof File
          ? await compressImageFile(pendingImage.file)
          : pendingImage.file,
      );
      const path = createStorageImagePath({
        basePath,
        imageId: pendingImage.imageId,
        extension: file.extension,
      });
      const url = await upload(path, file.blob);
      uploadedPaths.push(path);
      assets.push({
        id: pendingImage.imageId,
        url,
        path,
        createdAt,
        width: file.width,
        height: file.height,
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
      file: {
        blob: await fetchBlob(image.url),
        width: image.width,
        height: image.height,
      },
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
