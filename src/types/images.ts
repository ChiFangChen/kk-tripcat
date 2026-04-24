export interface ImageAsset {
  id: string;
  url: string;
  path: string;
  createdAt: string;
}

export interface PendingImageFile {
  file: Blob;
  imageId: string;
}
