/**
 * Local persistence layer for the user's watched films.
 * Uses localStorage — no auth required.
 */

const STORAGE_KEY = "cinecity_watched";

export interface WatchedStore {
  watched: Set<number>;
  ratings: Map<number, number>;
}

interface StoragePayload {
  /** Array of movie IDs the user has watched. */
  watched: number[];
  /** Sparse map of movieId → 1-5 star rating. */
  ratings: Record<string, number>;
}

/**
 * Read the watched store from localStorage.
 * Returns an empty store on first load or if data is corrupt.
 */
export function loadStore(): WatchedStore {
  if (typeof window === "undefined") {
    return { watched: new Set(), ratings: new Map() };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { watched: new Set(), ratings: new Map() };

    const parsed = JSON.parse(raw) as StoragePayload;
    const watched = new Set(Array.isArray(parsed.watched) ? parsed.watched : []);
    const ratings = new Map<number, number>();

    if (parsed.ratings && typeof parsed.ratings === "object") {
      for (const [k, v] of Object.entries(parsed.ratings)) {
        const id = Number(k);
        if (!isNaN(id) && typeof v === "number" && v >= 1 && v <= 5) {
          ratings.set(id, v);
        }
      }
    }

    return { watched, ratings };
  } catch {
    // Corrupt data — start fresh
    return { watched: new Set(), ratings: new Map() };
  }
}

/** Persist the watched store to localStorage. */
export function saveStore(store: WatchedStore): void {
  if (typeof window === "undefined") return;

  const payload: StoragePayload = {
    watched: Array.from(store.watched),
    ratings: Object.fromEntries(store.ratings),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full — fail silently
    console.warn("Failed to save watched store to localStorage");
  }
}

/**
 * Mark a movie as watched, optionally with a 1-5 star rating.
 * Mutates the store in place AND persists to localStorage.
 */
export function markWatched(
  store: WatchedStore,
  movieId: number,
  rating?: number,
): void {
  store.watched.add(movieId);
  if (rating !== undefined && rating >= 1 && rating <= 5) {
    store.ratings.set(movieId, Math.round(rating));
  }
  saveStore(store);
}

/** Remove a movie from the watched set. Mutates + persists. */
export function unmarkWatched(store: WatchedStore, movieId: number): void {
  store.watched.delete(movieId);
  store.ratings.delete(movieId);
  saveStore(store);
}

/** Check if a movie is in the user's watched set. */
export function isWatched(store: WatchedStore, movieId: number): boolean {
  return store.watched.has(movieId);
}

/** Get the user's rating for a movie, or null if unrated. */
export function getRating(store: WatchedStore, movieId: number): number | null {
  return store.ratings.get(movieId) ?? null;
}

/** Total count of watched movies. */
export function getWatchedCount(store: WatchedStore): number {
  return store.watched.size;
}

/** All watched movie IDs as an array. */
export function getWatchedIds(store: WatchedStore): number[] {
  return Array.from(store.watched);
}
