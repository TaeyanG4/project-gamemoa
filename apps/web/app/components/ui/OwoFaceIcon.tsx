/** OwOGG's brand mark — a minimal "OwO" face (two round eyes + a "w" mouth), drawn in the
 * exact same line-art convention as Lucide icons (fill="none", stroke="currentColor",
 * stroke-width 2, round caps/joins, 24x24 viewBox) so it sits as a visual sibling to any
 * Lucide icon used elsewhere in the app. This is the literal shape mirrored by
 * `apps/web/public/favicon.svg` and `scripts/generate-favicon.ts` — keep all three in sync. */
export function OwoFaceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="10" r="4" />
      <circle cx="17" cy="10" r="4" />
      <path d="M8 16l2 3 2-3 2 3 2-3" />
    </svg>
  );
}
