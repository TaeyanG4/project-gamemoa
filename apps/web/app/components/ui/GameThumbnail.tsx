import { useState } from "react";

interface GameThumbnailProps {
  thumbnail: string;
  title: string;
  accent?: string | undefined;
  /** Full control over sizing/effects (e.g. "w-24 h-24 shadow-xl") — no default, every caller
   * states its own size explicitly. */
  className: string;
  rounded?: string | undefined;
}

/** Single source of truth for "how a game's icon renders": the real thumbnail image when its
 * path looks valid and hasn't failed to load, otherwise a colored two-letter badge from the
 * game's accent color. Previously each screen re-implemented this differently — GameCard had the
 * real fallback logic, the per-game ranking page always showed letters even when a thumbnail
 * existed, and the gameplay header showed neither (just a flat color square). */
export function GameThumbnail({
  thumbnail,
  title,
  accent = "#6366f1",
  className,
  rounded = "rounded-2xl",
}: GameThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const isValidPath = thumbnail.startsWith("/") || thumbnail.startsWith("http");

  if (!imageError && isValidPath) {
    return (
      <img
        src={thumbnail}
        alt={title}
        onError={() => setImageError(true)}
        className={`${className} ${rounded} object-contain`}
      />
    );
  }

  return (
    <div
      className={`${className} ${rounded} flex items-center justify-center text-white font-extrabold`}
      style={{ backgroundColor: accent }}
    >
      {title.slice(0, 2)}
    </div>
  );
}
