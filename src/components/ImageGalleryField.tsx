import type { ImageAsset } from "../types/images";
import { galleryImageClassName } from "../utils/imageDisplayClasses";

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
    <div className={`grid gap-2 ${className}`.trim()}>
      {safeImages.map((image) => (
        <img
          key={image.id}
          src={image.url}
          alt=""
          className={galleryImageClassName}
        />
      ))}
    </div>
  );
}
