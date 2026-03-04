import type { LibraryItem } from "@shared/types";
import { CANONICAL_LIBRARY_ITEMS } from "@shared/types";

/** Convert canonical items to LibraryItem with id = stableId for fallback resolution. */
const DEFAULT_LIBRARY: LibraryItem[] = CANONICAL_LIBRARY_ITEMS.map((item) => ({
  id: item.stableId,
  stableId: item.stableId,
  type: item.type,
  name: item.name,
  intervals: item.intervals,
  description: null,
}));

const filterType = (type: LibraryItem["type"]) =>
  DEFAULT_LIBRARY.filter((item) => item.type === type);

export const DEFAULT_KEYS = filterType("key");
export const DEFAULT_SCALES = filterType("scale");
export const DEFAULT_MODES = filterType("mode");
export const DEFAULT_POSITIONS = filterType("position");
