export interface ImageAsset {
  id: string;
  url: string;
  path: string;
  createdAt: string;
  width: number;
  height: number;
}

export interface PendingImageFile {
  file: Blob | PreparedImageFile;
  imageId: string;
}

export interface PreparedImageFile {
  blob: Blob;
  width: number;
  height: number;
}
