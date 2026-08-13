import { useId } from "react";

/** OwOGG's brand mark — the word "OwO" (two round "O"s + a "w"), tilted diagonally, no
 * background tile. Built from the same line-art convention as Lucide icons (fill="none",
 * round caps/joins) but with a brand-gradient stroke instead of a flat color, since nothing
 * sits behind it to carry the gradient anymore. This is the literal shape mirrored by
 * `apps/web/public/favicon.svg` and `scripts/generate-favicon.ts` — keep all three in sync.
 * The gradient id is unique per instance (useId) so rendering this icon more than once on the
 * same page — e.g. Header + Footer — never collides on a shared `#bg` id. */
export function OwoWordmarkIcon({ className }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg
      viewBox="0 -8 48 32"
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <g transform="rotate(-25 24 8)">
        <circle cx="8" cy="8" r="7" />
        <circle cx="40" cy="8" r="7" />
        <path d="M17 3l3.5 10 3.5-8 3.5 8 3.5-10" />
      </g>
    </svg>
  );
}
