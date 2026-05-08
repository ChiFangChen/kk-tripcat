import { useState } from "react";
import { getImageAspectRatio } from "../utils/imageDisplayClasses";

export function LoadingImage({
  src,
  alt,
  width,
  height,
  frameClassName = "",
  frameContentClassName = "",
  fit = "contain",
  imageClassName = "",
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  frameClassName?: string;
  frameContentClassName?: string;
  fit?: "contain" | "cover";
  imageClassName?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const hasDimensions = Boolean(width && height);

  return (
    <span
      className={`loading-image-wrapper ${frameClassName}`.trim()}
      style={{
        width: width ? `${width}px` : undefined,
      }}
    >
      <span
        className={`loading-image-frame ${frameContentClassName}`.trim()}
        style={{
          aspectRatio: hasDimensions
            ? getImageAspectRatio({ width, height })
            : undefined,
        }}
      >
        {hasDimensions && !loaded && (
          <span className="loading-image-skeleton" />
        )}
        <img
          src={src}
          alt={alt}
          className={`loading-image-img ${
            loaded ? "loading-image-img--loaded" : "loading-image-img--hidden"
          } ${
            fit === "cover"
              ? "loading-image-img--cover"
              : "loading-image-img--contain"
          } ${imageClassName}`.trim()}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      </span>
    </span>
  );
}
