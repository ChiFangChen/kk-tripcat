import type { ImageAsset } from "../types/images";
import { galleryImageClassName } from "../utils/imageDisplayClasses";
import { LoadingImage } from "./LoadingImage";

export function ImageGalleryField({
  images,
  className = "",
}: {
  images?: ImageAsset[];
  className?: string;
}) {
  const safeImages = images || [];
  if (safeImages.length === 0) return null;

  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()}>
      {safeImages.map((image) => (
        <LoadingImage
          key={image.id}
          src={image.url}
          alt=""
          width={image.width}
          height={image.height}
          imageClassName={galleryImageClassName}
        />
      ))}
    </div>
  );
}
