import { NextResponse } from "next/server";
import { encodeToCityBuilding } from "@/lib/movieEncoder";
import { fetchTopMovies, fetchMovieDetail } from "@/lib/tmdb";
import type { TmdbMovie } from "@/lib/tmdb";

/** Lot spacing for spiral grid (world units). */
const GRID_SIZE = 48;
const TMDB_PAGES = 20;

/** Discover pages fetched per batch (parallel TMDB calls reset connections). */
const PAGE_BATCH_SIZE = 3;
/** How many top movies get enriched with revenue/runtime detail. */
const DETAIL_COUNT = 100;
/** Batch size for detail fetches to avoid TMDB rate limits. */
const DETAIL_BATCH_SIZE = 10;
/** Delay between batches (ms). */
const BATCH_DELAY_MS = 300;

async function fetchAllDiscoverPages(): Promise<TmdbMovie[]> {
  const movies: TmdbMovie[] = [];

  for (let page = 1; page <= TMDB_PAGES; page += PAGE_BATCH_SIZE) {
    const end = Math.min(page + PAGE_BATCH_SIZE - 1, TMDB_PAGES);
    const batch = await Promise.all(
      Array.from({ length: end - page + 1 }, (_, i) => fetchTopMovies(page + i)),
    );
    movies.push(...batch.flat());

    if (end < TMDB_PAGES) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return movies;
}

/**
 * Enrich the top N movies (by popularity) with revenue and runtime
 * from the /movie/{id} detail endpoint. The discover endpoint doesn't
 * include these fields, so tall buildings need this extra fetch.
 * @param movies - Full list sorted by popularity (discover default order)
 * @returns Same array, mutated in place with detail data merged
 */
async function enrichTopMovies(movies: TmdbMovie[]): Promise<void> {
  // Movies arrive from discover already sorted by popularity.desc
  const topSlice = movies.slice(0, DETAIL_COUNT);

  for (let i = 0; i < topSlice.length; i += DETAIL_BATCH_SIZE) {
    const batch = topSlice.slice(i, i + DETAIL_BATCH_SIZE);

    const details = await Promise.all(
      batch.map((m) => fetchMovieDetail(m.id)),
    );

    // Merge revenue + runtime back into the original objects
    for (let j = 0; j < batch.length; j++) {
      batch[j].revenue = details[j].revenue;
      batch[j].runtime = details[j].runtime;
    }

    // Pause between batches to stay under TMDB's ~40 req/10s limit
    if (i + DETAIL_BATCH_SIZE < topSlice.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
}

export async function GET() {
  try {
    const movies = await fetchAllDiscoverPages();

    // Enrich the 100 most popular with detail data (revenue, runtime)
    await enrichTopMovies(movies);

    const buildings = movies.map((movie, index) =>
      encodeToCityBuilding(movie, index, GRID_SIZE),
    );

    return NextResponse.json(buildings, {
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch movies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
