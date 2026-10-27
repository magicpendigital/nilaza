// The shell only needs to know which thresholds the content has scrolled past
// (sticky Explore search at 170 px, compact chat title at 220 px). Storing the
// raw offset re-rendered the whole shell on every scroll frame.
export const STICKY_SEARCH_SCROLL_Y = 170;
export const COMPACT_TITLE_SCROLL_Y = 220;

export type ScrollBand = 0 | 1 | 2;

export function scrollBandFor(scrollY: number): ScrollBand {
  if (scrollY > COMPACT_TITLE_SCROLL_Y) return 2;
  if (scrollY > STICKY_SEARCH_SCROLL_Y) return 1;
  return 0;
}
