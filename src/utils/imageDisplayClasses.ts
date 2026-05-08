export const galleryImageClassName =
  "max-w-full w-auto h-auto mx-auto object-contain";

export const shoppingThumbnailClassName = "w-full h-full object-cover";

export function getImageAspectRatio({
  width,
  height,
}: {
  width?: number;
  height?: number;
}): string {
  return `${width} / ${height}`;
}
