import { useEffect, useMemo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { ImageAsset, PendingImageFile } from "../types/images";
import { galleryImageClassName } from "../utils/imageDisplayClasses";
import { LoadingImage } from "./LoadingImage";

function getPreviewBlob(file: PendingImageFile["file"]): Blob {
  return "blob" in file ? file.blob : file;
}

export function MultiImageUpload({
  existingImages,
  pendingImages,
  onAddFiles,
  onRemoveExisting,
  onRemovePending,
}: {
  existingImages?: ImageAsset[];
  pendingImages?: PendingImageFile[];
  onAddFiles: (files: File[]) => void;
  onRemoveExisting: (imageId: string) => void;
  onRemovePending: (imageId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const safeExistingImages = existingImages || [];
  const safePendingImages = pendingImages || [];
  const pendingPreviews = useMemo(
    () =>
      safePendingImages.map((image) => ({
        id: image.imageId,
        url: URL.createObjectURL(getPreviewBlob(image.file)),
        width: "blob" in image.file ? image.file.width : undefined,
        height: "blob" in image.file ? image.file.height : undefined,
      })),
    [safePendingImages],
  );

  useEffect(() => {
    return () => {
      pendingPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [pendingPreviews]);

  return (
    <div className="mt-2">
      {(safeExistingImages.length > 0 || safePendingImages.length > 0) && (
        <div className="flex flex-col gap-3 mb-3">
          {safeExistingImages.map((image) => (
            <PreviewCard
              key={image.id}
              url={image.url}
              width={image.width}
              height={image.height}
              onRemove={() => onRemoveExisting(image.id)}
            />
          ))}
          {pendingPreviews.map((image) => (
            <PreviewCard
              key={image.id}
              url={image.url}
              width={image.width}
              height={image.height}
              pending
              onRemove={() => onRemovePending(image.id)}
            />
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length > 0) onAddFiles(files);
          if (inputRef.current) inputRef.current.value = "";
        }}
        className="hidden"
      />
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <FontAwesomeIcon icon={faCamera} className="mr-1" />
        新增圖片
      </button>
    </div>
  );
}

function PreviewCard({
  url,
  width,
  height,
  pending = false,
  onRemove,
}: {
  url: string;
  width?: number;
  height?: number;
  pending?: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="relative">
      <LoadingImage
        src={url}
        alt=""
        width={width}
        height={height}
        imageClassName={galleryImageClassName}
      />
      <button
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs"
        onClick={onRemove}
        type="button"
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>
      {pending && (
        <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-[10px] text-white">
          待上傳
        </span>
      )}
    </div>
  );
}
