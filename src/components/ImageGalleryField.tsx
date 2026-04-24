import type { ImageAsset } from "../types/images";

export function ImageGalleryField({
  images,
  className = "",
}: {
  images: ImageAsset[];
  className?: string;
}) {
  if (images.length === 0) return null;

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`.trim()}>
      {images.map((image) => (
        <img
          key={image.id}
          src={image.url}
          alt=""
          className="w-full rounded-lg max-h-56 object-cover"
        />
      ))}
    </div>
  );
}
