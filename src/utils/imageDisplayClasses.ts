export const galleryImageClassName =
  "max-w-full w-auto h-auto mx-auto rounded-lg object-contain";

export const shoppingThumbnailClassName =
  "w-8 h-auto rounded object-contain flex-shrink-0";

export function getImageAspectRatio({
  width,
  height,
}: {
  width?: number;
  height?: number;
}): string {
  if (!width || !height) return "4 / 3";
  return `${width} / ${height}`;
}
