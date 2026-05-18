const TMDB_BASE = "https://api.themoviedb.org/3";
const DISCOVER_PATH = "/discover/movie";
const TOTAL_PAGES = 20;

export interface TmdbMovie {
  id: number;
  title: string;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  revenue: number;
  runtime: number;
  popularity: number;
  poster_path: string | null;
  overview: string;
}

interface TmdbDiscoverResult {
  id: number;
  title: string;
  release_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
  revenue?: number;
  runtime?: number;
  popularity?: number;
  poster_path?: string | null;
  overview?: string;
}

interface TmdbDiscoverResponse {
  page: number;
  results: TmdbDiscoverResult[];
  total_pages: number;
  total_results: number;
}

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_TMDB_API_KEY is not set");
  }
  return key;
}

function normalizeMovie(raw: TmdbDiscoverResult): TmdbMovie {
  return {
    id: raw.id,
    title: raw.title,
    release_date: raw.release_date ?? "",
    genre_ids: raw.genre_ids ?? [],
    vote_average: raw.vote_average ?? 0,
    vote_count: raw.vote_count ?? 0,
    revenue: raw.revenue ?? 0,
    runtime: raw.runtime ?? 0,
    popularity: raw.popularity ?? 0,
    poster_path: raw.poster_path ?? null,
    overview: raw.overview ?? "",
  };
}

/** Detail response from /movie/{id} — only the fields we need. */
interface TmdbDetailResponse {
  id: number;
  revenue?: number;
  runtime?: number;
}

/**
 * Fetch detail for a single movie to get revenue and runtime.
 * The /discover endpoint doesn't return these fields.
 */
export async function fetchMovieDetail(
  movieId: number,
): Promise<{ revenue: number; runtime: number }> {
  const url = new URL(`${TMDB_BASE}/movie/${movieId}`);
  url.searchParams.set("api_key", getApiKey());

  const res = await fetch(url.toString(), {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    // Non-fatal: return zeros so the building still renders
    console.warn(`TMDB detail failed for movie ${movieId}: ${res.status}`);
    return { revenue: 0, runtime: 0 };
  }

  const data = (await res.json()) as TmdbDetailResponse;
  return {
    revenue: data.revenue ?? 0,
    runtime: data.runtime ?? 0,
  };
}

/** Fetch one page of popular movies from TMDB discover (pages 1–20). */
export async function fetchTopMovies(page: number): Promise<TmdbMovie[]> {
  if (page < 1 || page > TOTAL_PAGES) {
    throw new RangeError(`page must be between 1 and ${TOTAL_PAGES}`);
  }

  const url = new URL(`${TMDB_BASE}${DISCOVER_PATH}`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB discover failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as TmdbDiscoverResponse;
  return data.results.map(normalizeMovie);
}
