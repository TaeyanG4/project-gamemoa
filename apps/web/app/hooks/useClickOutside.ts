import { useEffect, type RefObject } from "react";

/** Closes a popover/dropdown when the user interacts outside it. Uses `pointerdown` (not
 * `mouseleave`) so it works the same on touch devices as on mouse — `mouseleave` never fires on
 * tap, which was leaving dropdowns stuck open on mobile with no way to dismiss them short of
 * tapping the toggle button again. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, onOutside, enabled]);
}
