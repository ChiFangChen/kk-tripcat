export const galleryImageClassName =
  "max-w-full w-auto h-auto mx-auto object-contain";

export const shoppingThumbnailClassName =
  "w-8 h-auto object-contain flex-shrink-0";

export function getImageAspectRatio({
  width,
  height,
}: {
  width?: number;
  height?: number;
}): string {
  return `${width} / ${height}`;
}
