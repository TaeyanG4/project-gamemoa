import { useId } from "react";

/** OwOGG's brand mark — the word "OwO" (two round "O"s + a "w"), tilted diagonally, stroked in
 * white on a brand-gradient rounded hub (bg-gradient-to-tr from-brand to-accent-purple) — the
 * same background treatment the original gamemoa icon used. This is the literal shape mirrored
 * by `apps/web/public/favicon.svg` and `scripts/generate-favicon.ts` — keep all three in sync.
 * The gradient id is unique per instance (useId) so rendering this icon more than once on the
 * same page — e.g. Header + Footer — never collides on a shared `#bg` id. */
export function OwoWordmarkIcon({ className }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="48" height="48" rx="10.5" ry="10.5" fill={`url(#${gradientId})`} />
      <g
        transform="translate(24,24) scale(0.8720555211130349) translate(-24,-8) rotate(-25,24,8)"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="8" cy="8" r="7" />
        <circle cx="40" cy="8" r="7" />
        <path d="M17 3C17 16 24 16 24 5C24 16 31 16 31 3" />
      </g>
    </svg>
  );
}
