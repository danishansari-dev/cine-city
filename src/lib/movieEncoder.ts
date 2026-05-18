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
  return clamp(Math.log10(revenue + 1) * 6, 2, 40);
}

function encodeWidth(runtime: number): number {
  if (!runtime || runtime <= 0) return 1.8;
  return clamp(1.2 + ((runtime - 60) / 140) * 1.6, 1.2, 2.8);
}

function encodeDepth(voteAverage: number): number {
  return Math.abs(voteAverage - 6) * 0.4 + 1;
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
  const { x, z } = spiralGridPosition(index, gridSize);

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
