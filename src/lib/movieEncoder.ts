import type { CityBuilding } from "@/lib/city";
import { spiralGridPosition } from "@/lib/city";
import type { TmdbMovie } from "@/lib/tmdb";

/** TMDB genre id → display bucket for color lookup */
export const GENRE_ID_TO_BUCKET: Record<number, keyof typeof GENRE_COLORS> = {
  28: "action",
  12: "action",
  18: "drama",
  10751: "drama",
  27: "horror",
  878: "scifi",
  10749: "romance",
  35: "comedy",
  16: "animation",
  99: "documentary",
  53: "thriller",
  80: "thriller",
  9648: "thriller",
};

export const GENRE_COLORS = {
  action: "#EF9F27",
  drama: "#378ADD",
  horror: "#E24B4A",
  scifi: "#1D9E75",
  romance: "#D4537E",
  comedy: "#97C459",
  animation: "#7F77DD",
  documentary: "#5DCAA5",
  thriller: "#D85A30",
  other: "#888780",
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function genreColor(genreIds: number[]): string {
  for (const id of genreIds) {
    const bucket = GENRE_ID_TO_BUCKET[id];
    if (bucket) return GENRE_COLORS[bucket];
  }
  return GENRE_COLORS.other;
}

function encodeHeight(revenue: number): number {
  // Higher multiplier (15) with wider clamp (4–90) produces
  // taller, chunkier skyscrapers instead of thin needles
  return clamp(Math.log10(revenue + 1) * 15, 4, 90);
}

function encodeWidth(runtime: number): number {
  // Wider buildings (3–5 units) fill the grid and look like
  // real city blocks rather than matchstick pins
  if (!runtime || runtime <= 0) return 3.5;
  return clamp(2.5 + ((runtime - 60) / 140) * 2.5, 3.0, 5.0);
}

function encodeDepth(voteAverage: number): number {
  // Minimum depth 2.5 ensures even average-rated films have
  // substantial footprint visible from the skyline angle
  return Math.abs(voteAverage - 6) * 0.6 + 2.5;
}

function deriveRenderFields(
  width: number,
  depth: number,
  height: number,
  voteAverage: number,
): Pick<
  CityBuilding,
  | "floors"
  | "windowsPerFloor"
  | "sideWindowsPerFloor"
  | "litPercentage"
  | "custom_color"
> {
  return {
    floors: Math.max(1, Math.floor(height / 6)),
    windowsPerFloor: Math.max(1, Math.floor(width / 0.4)),
    sideWindowsPerFloor: Math.max(1, Math.floor(depth / 0.4)),
    litPercentage: clamp(voteAverage / 10, 0.1, 1),
    custom_color: null,
  };
}

export function encodeToCityBuilding(
  movie: TmdbMovie,
  index: number,
  gridSize: number,
): CityBuilding {
  const spiral = spiralGridPosition(index, gridSize);
  // Tighter spacing (6.5) packs chunkier buildings close together
  // for a dense Manhattan-like skyline — not a sparse pin-board
  const x = spiral.x * 6.5;
  const z = spiral.z * 6.5;

  // Art house proxy: films with real audiences but no box office data
  // still deserve vertical presence in the skyline
  const effectiveRevenue =
    movie.revenue > 0
      ? movie.revenue
      : movie.vote_count > 5000
        ? movie.vote_count * 1500
        : 0;

  const width = encodeWidth(movie.runtime);
  const depth = encodeDepth(movie.vote_average);
  const height = encodeHeight(effectiveRevenue);
  const color = genreColor(movie.genre_ids);

  return {
    id: `movie-${movie.id}`,
    x,
    z,
    position: [x, 0, z],
    width,
    depth,
    height,
    color,
    movieId: movie.id,
    title: movie.title,
    posterPath: movie.poster_path ?? "",
    voteAverage: movie.vote_average,
    genres: movie.genre_ids,
    release_date: movie.release_date,
    // Fallback to 2000 for films missing a valid release date
    release_year: parseInt(movie.release_date?.slice(0, 4), 10) || 2000,
    ...deriveRenderFields(width, depth, height, movie.vote_average),
  };
}
