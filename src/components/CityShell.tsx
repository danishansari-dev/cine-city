"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import dynamic from "next/dynamic";
import type { CityBuilding } from "@/lib/city";
import { THEME_NAMES, type CityCanvasHandle } from "@/components/CityCanvas";
import { GENRE_COLORS, GENRE_ID_TO_BUCKET } from "@/lib/movieEncoder";
import {
  loadStore,
  markWatched,
  unmarkWatched,
  isWatched,
  getRating,
  getWatchedCount,
  type WatchedStore,
} from "@/lib/userCity";

const CityCanvas = dynamic(() => import("@/components/CityCanvas"), { ssr: false });

const TMDB_POSTER_W45 = "https://image.tmdb.org/t/p/w45";
const TMDB_POSTER_W154 = "https://image.tmdb.org/t/p/w154";
const TMDB_POSTER_W780 = "https://image.tmdb.org/t/p/w780";
const TMDB_PROFILE_W45 = "https://image.tmdb.org/t/p/w45";
const TMDB_LOGO_W45 = "https://image.tmdb.org/t/p/w45";

const GENRE_NAMES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbVideo {
  key: string;
  site: string;
  type: string;
}

interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface TmdbWatchRegion {
  flatrate?: TmdbProvider[];
}

interface TmdbMovieDetail {
  id: number;
  title: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  backdrop_path?: string | null;
  poster_path?: string | null;
  genres?: TmdbGenre[];
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCastMember[] };
  "watch/providers"?: { results: Record<string, TmdbWatchRegion> };
}

const shell: CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
};

const searchWrap: CSSProperties = {
  position: "absolute",
  top: 20,
  left: "50%",
  transform: "translateX(-50%)",
  width: 320,
  zIndex: 20,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

const flyBtnWrap: CSSProperties = {
  position: "absolute",
  top: 20,
  zIndex: 21,
  fontFamily: 'ui-monospace, SFMono-Regular, "Cascadia Code", monospace',
};

const flyBtn: CSSProperties = {
  padding: "9px 14px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  color: "#fff",
  background: "rgba(10, 16, 28, 0.92)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255, 255, 255, 0.22)",
  borderRadius: 6,
  cursor: "pointer",
};

const flyBtnActive: CSSProperties = {
  borderColor: "#a8d8a0",
  color: "#a8d8a0",
  boxShadow: "0 0 12px rgba(168, 216, 160, 0.35)",
};

const flyHudWrap: CSSProperties = {
  position: "absolute",
  bottom: 24,
  left: 24,
  zIndex: 20,
  fontFamily: 'ui-monospace, SFMono-Regular, "Cascadia Code", monospace',
  fontSize: 11,
  color: "#fff",
  lineHeight: 1.55,
  pointerEvents: "none",
  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
};

const flyHudStatRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 2,
};

const flyHudBarTrack: CSSProperties = {
  display: "inline-block",
  width: 48,
  height: 4,
  background: "rgba(255,255,255,0.2)",
  borderRadius: 2,
  overflow: "hidden",
  verticalAlign: "middle",
};

const flyHudHelp: CSSProperties = {
  marginTop: 8,
  opacity: 0.65,
};

const searchInput: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  fontSize: 14,
  color: "#f4f4f5",
  background: "rgba(10, 16, 28, 0.92)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: 8,
  outline: "none",
};

const searchDropdown: CSSProperties = {
  marginTop: 6,
  background: "rgba(10, 16, 28, 0.96)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
};

const searchResultRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "8px 12px",
  border: "none",
  background: "transparent",
  color: "#f4f4f5",
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer",
};

const searchThumb: CSSProperties = {
  width: 28,
  height: 42,
  objectFit: "cover",
  borderRadius: 4,
  flexShrink: 0,
  background: "#1e293b",
};

const searchResultMeta: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
};

const searchResultTitle: CSSProperties = {
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const searchResultYear: CSSProperties = {
  fontSize: 11,
  color: "#71717a",
};

const hoverCardStyle: CSSProperties = {
  position: "absolute",
  top: 24,
  right: 24,
  width: 280,
  background: "rgba(10, 16, 28, 0.92)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 10,
  padding: 14,
  color: "#f4f4f5",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  pointerEvents: "none",
  zIndex: 10,
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
  transition: "opacity 150ms ease-in-out",
};

const screenshotBtnWrap: CSSProperties = {
  position: "absolute",
  top: 150,
  right: 24,
  zIndex: 20,
};

const screenshotBtn: CSSProperties = {
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  borderRadius: 8,
  border: "1px solid rgba(255, 255, 255, 0.15)",
  background: "rgba(10, 16, 28, 0.92)",
  backdropFilter: "blur(8px)",
  color: "#e4e4e7",
  cursor: "pointer",
};

const letterboxBar: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: "10%",
  background: "#000",
  zIndex: 25,
  pointerEvents: "none",
};

const letterboxCaption: CSSProperties = {
  position: "absolute",
  bottom: "5%",
  left: "50%",
  transform: "translateX(-50%)",
  color: "#fff",
  fontSize: 13,
  fontFamily: 'inherit',
  zIndex: 26,
  pointerEvents: "none",
  margin: 0,
  whiteSpace: "nowrap",
};

const toastStyle: CSSProperties = {
  position: "absolute",
  bottom: 28,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "10px 18px",
  background: "rgba(10, 16, 28, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 8,
  color: "#f4f4f5",
  fontSize: 13,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  zIndex: 30,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
};

const cardRow: CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
};

const posterThumb: CSSProperties = {
  width: 77,
  height: 116,
  objectFit: "cover",
  borderRadius: 6,
  flexShrink: 0,
  background: "#1e293b",
};

const posterPlaceholder: CSSProperties = {
  ...posterThumb,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  color: "#64748b",
};

const cardBody: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.25,
};

const metaRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  fontSize: 13,
  color: "#a1a1aa",
};

const starsStyle: CSSProperties = {
  color: "#fbbf24",
  letterSpacing: 1,
  fontSize: 14,
  lineHeight: 1,
};

const ratingNum: CSSProperties = {
  color: "#d4d4d8",
  fontSize: 12,
};

const pillBase: CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  color: "#fff",
  alignSelf: "flex-start",
};

type GenreBucket = keyof typeof GENRE_COLORS;

const GENRE_BUCKETS = Object.keys(GENRE_COLORS) as GenreBucket[];
const TOTAL_GENRES = GENRE_BUCKETS.length;

const GENRE_LABELS: Record<GenreBucket, string> = {
  action: "Action",
  drama: "Drama",
  horror: "Horror",
  scifi: "Sci-Fi",
  romance: "Romance",
  comedy: "Comedy",
  animation: "Animation",
  documentary: "Documentary",
  thriller: "Thriller",
  other: "Other",
};

const genreFilterWrap: CSSProperties = {
  position: "absolute",
  top: 20,
  left: 20,
  zIndex: 20,
  maxWidth: "min(420px, calc(100vw - 40px))",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  pointerEvents: "auto",
};

const genreFilterRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const genreFilterPillBase: CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  borderWidth: 1,
  borderStyle: "solid",
  cursor: "pointer",
  transition: "background 120ms, border-color 120ms, color 120ms",
};

function genreFilterAllPillStyle(active: boolean): CSSProperties {
  return {
    ...genreFilterPillBase,
    borderColor: active ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.12)",
    background: active ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.08)",
    color: active ? "#f4f4f5" : "#a1a1aa",
  };
}

function genreFilterGenrePillStyle(active: boolean, color: string): CSSProperties {
  return {
    ...genreFilterPillBase,
    borderColor: active ? color : "rgba(255, 255, 255, 0.12)",
    background: active ? color : "rgba(255, 255, 255, 0.08)",
    color: active ? darkenHex(color) : "#a1a1aa",
  };
}

function darkenHex(hex: string, amount = 0.55): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor(((n >> 16) & 0xff) * amount);
  const g = Math.floor(((n >> 8) & 0xff) * amount);
  const b = Math.floor((n & 0xff) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function createAllGenresSet(): Set<string> {
  return new Set(GENRE_BUCKETS);
}

const modalOverlay: CSSProperties = {
  position: "absolute",
  inset: 0,
  minHeight: "100vh",
  background: "rgba(0, 0, 0, 0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 20,
  boxSizing: "border-box",
};

const modalCard: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 480,
  maxHeight: "min(92vh, 900px)",
  overflowY: "auto",
  background: "#12141c",
  borderRadius: 12,
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.55)",
  color: "#f4f4f5",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

const modalBackdrop: CSSProperties = {
  width: "100%",
  height: 200,
  objectFit: "cover",
  display: "block",
  background: "#1e293b",
};

const modalContent: CSSProperties = {
  padding: "18px 20px 22px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const modalTitle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.2,
};

const modalTagline: CSSProperties = {
  margin: "-6px 0 0",
  fontSize: 14,
  fontStyle: "italic",
  color: "#a1a1aa",
};

const modalMeta: CSSProperties = {
  fontSize: 14,
  color: "#a1a1aa",
};

const genreRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const voteRow: CSSProperties = {
  fontSize: 14,
  color: "#e4e4e7",
};

const sectionLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#71717a",
  marginBottom: 8,
};

const castRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const castChip: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px 4px 4px",
  background: "rgba(255, 255, 255, 0.06)",
  borderRadius: 999,
  fontSize: 12,
};

const castAvatar: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  objectFit: "cover",
  background: "#334155",
  flexShrink: 0,
};

const castInitial: CSSProperties = {
  ...castAvatar,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  color: "#e2e8f0",
};

const trailerBtn: CSSProperties = {
  display: "inline-block",
  padding: "10px 16px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

const providerRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
};

const providerItem: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  color: "#a1a1aa",
  maxWidth: 64,
  textAlign: "center",
};

const providerLogo: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 8,
  objectFit: "contain",
  background: "#1e293b",
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 2,
  width: 36,
  height: 36,
  border: "none",
  borderRadius: "50%",
  background: "rgba(0, 0, 0, 0.55)",
  color: "#fff",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const readMoreBtn: CSSProperties = {
  marginTop: 6,
  padding: 0,
  border: "none",
  background: "none",
  color: "#93c5fd",
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "underline",
};

const mutedText: CSSProperties = {
  fontSize: 13,
  color: "#71717a",
};

const watchedBtnStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 150ms, border-color 150ms",
};

const starRatingRow: CSSProperties = {
  display: "flex",
  gap: 4,
  marginLeft: "auto",
};

const starBtn: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 18,
  padding: 0,
  lineHeight: 1,
  transition: "transform 100ms",
};

const counterStyle: CSSProperties = {
  position: "absolute",
  bottom: 20,
  left: 20,
  padding: "8px 14px",
  background: "rgba(10, 16, 28, 0.85)",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 8,
  color: "#a1a1aa",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  fontSize: 13,
  fontWeight: 500,
  zIndex: 10,
  pointerEvents: "none",
  letterSpacing: "0.02em",
};

// ─── Year Scrubber Styles ───────────────────────────────────────

const SCRUB_MIN = 1970;
const SCRUB_MAX = 2025;

const scrubberWrap: CSSProperties = {
  position: "absolute",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  zIndex: 15,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  pointerEvents: "auto",
  userSelect: "none",
};

const scrubberLabel: CSSProperties = {
  fontSize: 32,
  fontWeight: 500,
  color: "#f4f4f5",
  lineHeight: 1,
  letterSpacing: "-0.02em",
  textShadow: "0 2px 12px rgba(0, 0, 0, 0.6)",
};

const scrubberBadge: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#a1a1aa",
  letterSpacing: "0.04em",
};

const scrubberRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const scrubberPlayBtn: CSSProperties = {
  width: 34,
  height: 34,
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "50%",
  background: "rgba(10, 16, 28, 0.85)",
  backdropFilter: "blur(6px)",
  color: "#f4f4f5",
  fontSize: 15,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 150ms, border-color 150ms",
  flexShrink: 0,
};

const scrubberSlider: CSSProperties = {
  width: 260,
  height: 6,
  cursor: "pointer",
  accentColor: "#6090e0",
};

/**
 * Year scrubber — the core viral mechanic.
 * Drag through decades and watch the city build itself.
 */
function YearScrubber({
  year,
  filmCount,
  onChange,
}: {
  year: number;
  filmCount: number;
  onChange: (year: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const yearRef = useRef(year);
  yearRef.current = year;

  // Auto-play: advance 1 year every 400ms, stop at SCRUB_MAX
  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    intervalRef.current = setInterval(() => {
      const next = yearRef.current + 1;
      if (next > SCRUB_MAX) {
        setPlaying(false);
        return;
      }
      onChange(next);
    }, 400);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, onChange]);

  // Pause auto-play when user manually drags
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false);
    onChange(Number(e.target.value));
  };

  const togglePlay = () => {
    // If at max, restart from min when pressing play
    if (!playing && yearRef.current >= SCRUB_MAX) {
      onChange(SCRUB_MIN);
    }
    setPlaying((p) => !p);
  };

  return (
    <div style={scrubberWrap}>
      <span style={scrubberLabel}>{year}</span>
      <span style={scrubberBadge}>
        {filmCount} film{filmCount !== 1 ? "s" : ""}
      </span>
      <div style={scrubberRow}>
        <button
          type="button"
          style={{
            ...scrubberPlayBtn,
            borderColor: playing
              ? "rgba(96, 144, 224, 0.6)"
              : "rgba(255, 255, 255, 0.2)",
            background: playing
              ? "rgba(96, 144, 224, 0.18)"
              : "rgba(10, 16, 28, 0.85)",
          }}
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          min={SCRUB_MIN}
          max={SCRUB_MAX}
          step={1}
          value={year}
          onChange={handleSlider}
          style={scrubberSlider}
          aria-label="Year scrubber"
        />
      </div>
    </div>
  );
}

const THEME_SWATCH_COLORS = ["#0a1628", "#2d1b4e", "#0d1f1a", "#0a1f12"] as const;

const themeSwitcherWrap: CSSProperties = {
  position: "absolute",
  bottom: 368,
  right: 20,
  zIndex: 11,
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const tastePanelWrap: CSSProperties = {
  position: "absolute",
  bottom: 100,
  right: 20,
  zIndex: 10,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

function ThemeSwitcher({
  active,
  onChange,
}: {
  active: number;
  onChange: (index: number) => void;
}) {
  return (
    <div style={themeSwitcherWrap} role="group" aria-label="City theme">
      {THEME_NAMES.map((name, i) => (
        <button
          key={name}
          type="button"
          title={name}
          aria-label={`${name} theme`}
          aria-pressed={active === i}
          onClick={() => onChange(i)}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: THEME_SWATCH_COLORS[i],
            border: "0.5px solid rgba(255, 255, 255, 0.3)",
            padding: 0,
            cursor: "pointer",
            ...(active === i
              ? { outline: "2px solid white", outlineOffset: "2px" }
              : {}),
          }}
        />
      ))}
    </div>
  );
}

const tasteToggleBtn: CSSProperties = {
  padding: "8px 14px",
  background: "rgba(10, 16, 28, 0.92)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(45, 212, 191, 0.35)",
  borderRadius: 8,
  color: "#5eead4",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.04em",
};

const tasteCard: CSSProperties = {
  width: 220,
  minHeight: 260,
  background: "rgba(10, 16, 28, 0.92)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(45, 212, 191, 0.25)",
  borderRadius: 10,
  padding: "10px 10px 12px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
};

const tasteCardHeader: CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const tasteCardTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#5eead4",
};

const tasteCollapseBtn: CSSProperties = {
  background: "none",
  border: "none",
  color: "#71717a",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
};

const tasteSummary: CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: "#a1a1aa",
  textAlign: "center",
  lineHeight: 1.35,
  maxWidth: 200,
};

const tasteExplored: CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: "#71717a",
};

const AXIS_COUNT = 6;
const HEX_CX = 100;
const HEX_CY = 100;
const HEX_MAX_R = 72;
const HEX_REF_R = HEX_MAX_R * 0.5;

const AXIS_META = [
  { label: "Mainstream", high: "mainstream", low: "niche" },
  { label: "Uplifting", high: "uplifting", low: "dark" },
  { label: "Action", high: "action-heavy", low: null },
  { label: "Cerebral", high: "cerebral", low: null },
  { label: "Fantastical", high: "fantastical", low: null },
  { label: "Contrarian", high: "contrarian", low: null },
] as const;

interface TasteProfile {
  scores: number[];
  summary: string;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Discover sort order proxy: index 0 = most popular. */
function popularityNorm(building: CityBuilding, all: CityBuilding[]): number {
  const idx = all.findIndex((b) => b.movieId === building.movieId);
  if (idx < 0 || all.length <= 1) return 0.5;
  return 1 - idx / (all.length - 1);
}

function hasGenreBucket(building: CityBuilding, buckets: string[]): boolean {
  return building.genres.some((id) => {
    const bucket = GENRE_ID_TO_BUCKET[id];
    return bucket !== undefined && buckets.includes(bucket);
  });
}

function computeTasteProfile(
  allBuildings: CityBuilding[],
  store: WatchedStore,
): TasteProfile {
  const watched = allBuildings.filter((b) => b.movieId > 0 && isWatched(store, b.movieId));
  const n = watched.length;
  if (n === 0) {
    return {
      scores: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      summary: "Your city is still taking shape",
    };
  }

  const mainstream =
    watched.reduce((sum, b) => sum + popularityNorm(b, allBuildings), 0) / n;

  const uplifting =
    watched.reduce((sum, b) => sum + b.voteAverage / 10, 0) / n;

  const actionHeavy =
    watched.filter((b) => hasGenreBucket(b, ["action", "thriller"])).length / n;

  const cerebral =
    watched.filter((b) => hasGenreBucket(b, ["drama", "documentary"])).length / n;

  const fantastical =
    watched.filter((b) => hasGenreBucket(b, ["scifi", "animation"])).length / n;

  const rated = watched.filter((b) => getRating(store, b.movieId) !== null);
  let contrarian = 0.5;
  if (rated.length >= 2) {
    const diffs = rated.map((b) => {
      const stars = getRating(store, b.movieId)!;
      const userOnTen = stars * 2;
      return userOnTen - b.voteAverage;
    });
    const mean = diffs.reduce((a, d) => a + d, 0) / diffs.length;
    const variance =
      diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / diffs.length;
    contrarian = clamp01(Math.sqrt(variance) / 3);
  } else if (rated.length === 1) {
    const b = rated[0];
    const stars = getRating(store, b.movieId)!;
    contrarian = clamp01(Math.abs(stars * 2 - b.voteAverage) / 5);
  }

  const scores = [
    clamp01(mainstream),
    clamp01(uplifting),
    clamp01(actionHeavy),
    clamp01(cerebral),
    clamp01(fantastical),
    clamp01(contrarian),
  ];

  const traits: { value: number; trait: string }[] = [];
  for (let i = 0; i < scores.length; i++) {
    const value = scores[i];
    const meta = AXIS_META[i];
    if (value >= 0.55) traits.push({ value, trait: meta.high });
    else if (value <= 0.45 && meta.low) traits.push({ value: 1 - value, trait: meta.low });
  }
  traits.sort((a, b) => b.value - a.value);

  let summary: string;
  if (traits.length === 0) {
    summary = "Your taste is balanced across the skyline";
  } else if (traits.length === 1) {
    summary = `Your city leans ${traits[0].trait}`;
  } else {
    summary = `Your city leans ${traits[0].trait} and ${traits[1].trait}`;
  }

  return { scores, summary };
}

function hexCoords(
  cx: number,
  cy: number,
  radius: number,
  axisIndex: number,
): { x: number; y: number } {
  const angle = -Math.PI / 2 + (axisIndex * 2 * Math.PI) / AXIS_COUNT;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function hexPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  scores?: number[],
): string {
  return Array.from({ length: AXIS_COUNT }, (_, i) => {
    const r = scores ? radius * clamp01(scores[i]) : radius;
    const { x, y } = hexCoords(cx, cy, r, i);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function axisLabelPos(
  cx: number,
  cy: number,
  radius: number,
  axisIndex: number,
): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  const angle = -Math.PI / 2 + (axisIndex * 2 * Math.PI) / AXIS_COUNT;
  const x = cx + radius * Math.cos(angle);
  const y = cy + radius * Math.sin(angle);
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  let anchor: "start" | "middle" | "end" = "middle";
  if (deg > 30 && deg < 150) anchor = "start";
  else if (deg > 210 && deg < 330) anchor = "end";
  return { x, y, anchor };
}

function TasteHexagonPanel({
  profile,
  explored,
  total,
  collapsed,
  onToggle,
}: {
  profile: TasteProfile;
  explored: number;
  total: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <button type="button" style={tasteToggleBtn} onClick={onToggle}>
        Taste ◆
      </button>
    );
  }

  return (
    <div style={tasteCard}>
      <div style={tasteCardHeader}>
        <span style={tasteCardTitle}>Taste profile</span>
        <button type="button" style={tasteCollapseBtn} onClick={onToggle} aria-label="Collapse">
          ×
        </button>
      </div>

      <svg width={200} height={200} viewBox="0 0 200 200" aria-hidden>
        {Array.from({ length: AXIS_COUNT }, (_, i) => {
          const end = hexCoords(HEX_CX, HEX_CY, HEX_MAX_R, i);
          return (
            <line
              key={`axis-${i}`}
              x1={HEX_CX}
              y1={HEX_CY}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={hexPolygonPoints(HEX_CX, HEX_CY, HEX_REF_R)}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <polygon
          points={hexPolygonPoints(HEX_CX, HEX_CY, HEX_MAX_R, profile.scores)}
          fill="rgba(45, 212, 191, 0.3)"
          stroke="#2dd4bf"
          strokeWidth={1.5}
        />
        {AXIS_META.map((meta, i) => {
          const { x, y, anchor } = axisLabelPos(HEX_CX, HEX_CY, HEX_MAX_R + 22, i);
          return (
            <text
              key={meta.label}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="#94a3b8"
              fontSize={9}
              fontFamily='system-ui, -apple-system, "Segoe UI", sans-serif'
            >
              {meta.label}
            </text>
          );
        })}
      </svg>

      <p style={tasteExplored}>
        Explored {explored} / {total} buildings
      </p>
      <p style={tasteSummary}>{profile.summary}</p>
    </div>
  );
}

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_TMDB_API_KEY is not set");
  return key;
}

function primaryGenreLabel(genreIds: number[]): string {
  for (const id of genreIds) {
    const name = GENRE_NAMES[id];
    if (name) return name;
  }
  return "Film";
}

function genrePillColor(genreId: number): string {
  const bucket = GENRE_ID_TO_BUCKET[genreId];
  return bucket ? GENRE_COLORS[bucket] : GENRE_COLORS.other;
}

function yearFromRelease(releaseDate?: string): string | null {
  if (!releaseDate || releaseDate.length < 4) return null;
  return releaseDate.slice(0, 4);
}

/** Burn letterbox bars + caption onto a WebGL canvas capture. */
function compositeLetterbox(webglDataUrl: string, scrubYear: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not create 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const barH = canvas.height * 0.1;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, barH);
      ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
      ctx.fillStyle = "#fff";
      ctx.font = '13px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`CineCity · ${scrubYear}`, canvas.width / 2, canvas.height - barH / 2);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load screenshot"));
    img.src = webglDataUrl;
  });
}

function LetterboxOverlay({ scrubYear }: { scrubYear: number }) {
  return (
    <>
      <div style={{ ...letterboxBar, top: 0 }} />
      <div style={{ ...letterboxBar, bottom: 0 }} />
      <p style={letterboxCaption}>CineCity · {scrubYear}</p>
    </>
  );
}

function CameraIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function formatRuntime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatVoteCount(count: number): string {
  if (count >= 1_000_000) {
    const m = count / 1_000_000;
    return `(${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M votes)`;
  }
  if (count >= 1_000) {
    const k = count / 1_000;
    return `(${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}K votes)`;
  }
  return `(${count.toLocaleString()} votes)`;
}

function findYouTubeTrailer(videos?: TmdbVideo[]): TmdbVideo | null {
  if (!videos) return null;
  return (
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ?? null
  );
}

function getFlatrateProviders(detail: TmdbMovieDetail): TmdbProvider[] {
  const results = detail["watch/providers"]?.results;
  if (!results) return [];
  const region = results.IN ?? results.US;
  return region?.flatrate ?? [];
}

function getCastInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function StarRating({ voteAverage }: { voteAverage: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(voteAverage / 2)));
  const empty = 5 - filled;
  return (
    <span style={starsStyle} aria-label={`${voteAverage.toFixed(1)} out of 10`}>
      {"★".repeat(filled)}
      <span style={{ color: "#52525b" }}>{"☆".repeat(empty)}</span>
    </span>
  );
}

/**
 * Mark-as-watched button with optional 1-5 star personal rating.
 * Shows inside the movie detail modal.
 */
function WatchedButton({
  movieId,
  store,
  onToggle,
}: {
  movieId: number;
  store: WatchedStore;
  onToggle: () => void;
}) {
  const watched = isWatched(store, movieId);
  const currentRating = getRating(store, movieId);

  const handleToggle = () => {
    if (watched) {
      unmarkWatched(store, movieId);
    } else {
      markWatched(store, movieId);
    }
    onToggle();
  };

  const handleRate = (stars: number) => {
    markWatched(store, movieId, stars);
    onToggle();
  };

  return (
    <div>
      <button
        type="button"
        style={{
          ...watchedBtnStyle,
          background: watched ? "rgba(74, 222, 128, 0.12)" : "rgba(255, 255, 255, 0.04)",
          borderColor: watched ? "rgba(74, 222, 128, 0.35)" : "rgba(255, 255, 255, 0.15)",
          color: watched ? "#4ade80" : "#e4e4e7",
        }}
        onClick={handleToggle}
      >
        {watched ? "✓ Watched" : "Mark as watched"}
        {watched && (
          <span style={starRatingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                style={{
                  ...starBtn,
                  color: currentRating !== null && s <= currentRating ? "#fbbf24" : "#52525b",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRate(s);
                }}
                aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
              >
                ★
              </button>
            ))}
          </span>
        )}
      </button>
    </div>
  );
}

function GenreFilterPanel({
  activeGenres,
  onChange,
}: {
  activeGenres: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const allActive = activeGenres.size === TOTAL_GENRES;

  const handleAllClick = () => {
    if (!allActive) onChange(createAllGenresSet());
  };

  const handleGenreClick = (bucket: GenreBucket) => {
    onChange(
      (() => {
        if (allActive) {
          return new Set([bucket]);
        }
        if (activeGenres.size === 1 && activeGenres.has(bucket)) {
          return createAllGenresSet();
        }
        const next = new Set(activeGenres);
        if (next.has(bucket)) {
          next.delete(bucket);
        } else {
          next.add(bucket);
        }
        return next;
      })(),
    );
  };

  return (
    <div style={genreFilterWrap} role="group" aria-label="Filter by genre">
      <div style={genreFilterRow}>
        <button
          type="button"
          style={genreFilterAllPillStyle(allActive)}
          aria-pressed={allActive}
          onClick={handleAllClick}
        >
          All
        </button>
        {GENRE_BUCKETS.map((bucket) => {
          const active = activeGenres.has(bucket);
          const color = GENRE_COLORS[bucket];
          return (
            <button
              key={bucket}
              type="button"
              style={genreFilterGenrePillStyle(active, color)}
              aria-pressed={active}
              onClick={() => handleGenreClick(bucket)}
            >
              {GENRE_LABELS[bucket]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchBar({
  buildings,
  onSelect,
}: {
  buildings: CityBuilding[];
  onSelect: (building: CityBuilding) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return buildings
      .filter((b) => b.title.toLowerCase().includes(q))
      .slice(0, 6);
  }, [buildings, query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuery("");
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const showDropdown = open && query.trim().length > 0;

  return (
    <div style={searchWrap}>
      <input
        type="search"
        value={query}
        placeholder="Search films…"
        style={searchInput}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        aria-label="Search films"
        aria-expanded={showDropdown}
        autoComplete="off"
      />
      {showDropdown && results.length > 0 ? (
        <div style={searchDropdown} role="listbox">
          {results.map((b) => {
            const year = yearFromRelease(b.release_date);
            return (
              <button
                key={b.id}
                type="button"
                role="option"
                style={searchResultRow}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                  onSelect(b);
                }}
              >
                {b.posterPath ? (
                  <img
                    src={`${TMDB_POSTER_W45}${b.posterPath}`}
                    alt=""
                    style={searchThumb}
                  />
                ) : (
                  <div style={{ ...searchThumb, background: "#334155" }} />
                )}
                <div style={searchResultMeta}>
                  <span style={searchResultTitle}>{b.title}</span>
                  {year ? <span style={searchResultYear}>{year}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function HoverCard({ building }: { building: CityBuilding }) {
  const year = yearFromRelease(building.release_date);
  const genreLabel = primaryGenreLabel(building.genres);

  return (
    <div style={cardRow}>
      {building.posterPath ? (
        <img
          src={`${TMDB_POSTER_W154}${building.posterPath}`}
          alt=""
          style={posterThumb}
        />
      ) : (
        <div style={posterPlaceholder}>No poster</div>
      )}
      <div style={cardBody}>
        <h2 style={titleStyle}>{building.title}</h2>
        <div style={metaRow}>
          {year && <span>{year}</span>}
          <StarRating voteAverage={building.voteAverage} />
          <span style={ratingNum}>{building.voteAverage.toFixed(1)}</span>
        </div>
        <span style={{ ...pillBase, background: building.color }}>{genreLabel}</span>
      </div>
    </div>
  );
}

interface MovieModalProps {
  building: CityBuilding;
  detail: TmdbMovieDetail | null;
  loading: boolean;
  store: WatchedStore;
  onClose: () => void;
  onWatchedToggle: () => void;
}

function MovieModal({ building, detail, loading, store, onClose, onWatchedToggle }: MovieModalProps) {
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  const title = detail?.title ?? building.title;
  const year =
    yearFromRelease(detail?.release_date ?? building.release_date) ?? "";
  const runtime = formatRuntime(detail?.runtime);
  const metaParts = [year, runtime].filter(Boolean);

  const backdropSrc = detail?.backdrop_path
    ? `${TMDB_POSTER_W780}${detail.backdrop_path}`
    : detail?.poster_path
      ? `${TMDB_POSTER_W780}${detail.poster_path}`
      : building.posterPath
        ? `${TMDB_POSTER_W780}${building.posterPath}`
        : null;

  const voteAverage = detail?.vote_average ?? building.voteAverage;
  const voteCount = detail?.vote_count ?? 0;
  const overview = detail?.overview?.trim() ?? "";
  const trailer = findYouTubeTrailer(detail?.videos?.results);
  const providers = detail ? getFlatrateProviders(detail) : [];
  const cast = (detail?.credits?.cast ?? []).slice(0, 5);
  const genres = detail?.genres ?? [];

  const overviewClamp: CSSProperties = overviewExpanded
    ? { margin: 0, fontSize: 14, lineHeight: 1.55, color: "#d4d4d8" }
    : {
        margin: 0,
        fontSize: 14,
        lineHeight: 1.55,
        color: "#d4d4d8",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      };

  return (
    <div
      style={modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <button type="button" style={closeBtn} onClick={onClose} aria-label="Close">
          ×
        </button>

        {backdropSrc ? (
          <img src={backdropSrc} alt="" style={modalBackdrop} />
        ) : (
          <div style={{ ...modalBackdrop, minHeight: 120 }} />
        )}

        <div style={modalContent}>
          <div>
            <h2 style={modalTitle}>{title}</h2>
            {detail?.tagline ? <p style={modalTagline}>{detail.tagline}</p> : null}
            {metaParts.length > 0 && (
              <p style={{ ...modalMeta, marginTop: 8 }}>{metaParts.join(" · ")}</p>
            )}
          </div>

          {loading && !detail ? (
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              {building.posterPath ? (
                <img
                  src={`${TMDB_POSTER_W154}${building.posterPath}`}
                  alt=""
                  style={{ ...posterThumb, width: 56, height: 84 }}
                />
              ) : null}
              <div style={{ fontSize: 14, color: "#a1a1aa" }}>
                Loading details…
              </div>
            </div>
          ) : null}

          {genres.length > 0 && (
            <div style={genreRow}>
              {genres.map((g) => (
                <span
                  key={g.id}
                  style={{
                    ...pillBase,
                    background: genrePillColor(g.id),
                    fontSize: 11,
                  }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          <p style={voteRow}>
            <span style={{ color: "#fbbf24" }}>★</span> {voteAverage.toFixed(1)} / 10{" "}
            {voteCount > 0 && (
              <span style={{ color: "#71717a" }}>{formatVoteCount(voteCount)}</span>
            )}
          </p>

          {overview ? (
            <div>
              <p style={overviewClamp}>{overview}</p>
              {overview.length > 180 && (
                <button
                  type="button"
                  style={readMoreBtn}
                  onClick={() => setOverviewExpanded((v) => !v)}
                >
                  {overviewExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          ) : null}

          {cast.length > 0 && (
            <div>
              <div style={sectionLabel}>Cast</div>
              <div style={castRow}>
                {cast.map((member) => (
                  <div key={member.id} style={castChip}>
                    {member.profile_path ? (
                      <img
                        src={`${TMDB_PROFILE_W45}${member.profile_path}`}
                        alt=""
                        style={castAvatar}
                      />
                    ) : (
                      <div style={castInitial}>
                        {getCastInitial(member.name)}
                      </div>
                    )}
                    <span>{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <WatchedButton
            movieId={building.movieId}
            store={store}
            onToggle={onWatchedToggle}
          />

          {trailer && (
            <a
              href={`https://youtube.com/watch?v=${trailer.key}`}
              target="_blank"
              rel="noopener noreferrer"
              style={trailerBtn}
            >
              Watch trailer
            </a>
          )}

          <div>
            <div style={sectionLabel}>Stream on</div>
            {providers.length > 0 ? (
              <div style={providerRow}>
                {providers.map((p) => (
                  <div key={p.provider_id} style={providerItem}>
                    {p.logo_path ? (
                      <img
                        src={`${TMDB_LOGO_W45}${p.logo_path}`}
                        alt=""
                        style={providerLogo}
                      />
                    ) : (
                      <div style={providerLogo} />
                    )}
                    <span>{p.provider_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={mutedText}>
                {loading && !detail ? "Checking availability…" : "Not streaming"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CityShell() {
  const [buildings, setBuildings] = useState<CityBuilding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<CityBuilding | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<CityBuilding | null>(null);
  const [movieDetail, setMovieDetail] = useState<TmdbMovieDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Year scrubber: filter buildings by release year
  const [scrubYear, setScrubYear] = useState(SCRUB_MAX);

  // Watched store: loaded from localStorage on mount
  const [watchedStore, setWatchedStore] = useState<WatchedStore | null>(null);
  // Counter tracks watched count for live updates without re-reading localStorage
  const [watchedCount, setWatchedCount] = useState(
    () => loadStore().getWatchedCount()
  );
  const [tasteCollapsed, setTasteCollapsed] = useState(false);
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window === "undefined") return 0;
    const n = Number(localStorage.getItem("cinecity_theme") ?? 0);
    return n >= 0 && n <= 3 ? n : 0;
  });
  const canvasRef = useRef<CityCanvasHandle>(null);
  const pendingHoverRef = useRef<CityBuilding | null>(null);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [activeGenres, setActiveGenres] = useState<Set<string>>(createAllGenresSet);
  const [flyMode, setFlyMode] = useState(false);
  const [flyHud, setFlyHud] = useState({ speed: 0.8, altitude: 120 });

  const handleExitFlyMode = useCallback(() => {
    setFlyMode(false);
    setFlyHud({ speed: 0.8, altitude: 120 });
  }, []);

  const toggleFlyMode = useCallback(() => {
    if (flyMode) {
      canvasRef.current?.requestExitFly();
    } else {
      setFlyMode(true);
    }
  }, [flyMode]);

  const handleFlyHud = useCallback((speed: number, altitude: number) => {
    setFlyHud({ speed, altitude });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "KeyF" && !e.repeat) {
        e.preventDefault();
        toggleFlyMode();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleFlyMode]);

  const visibleBuildings = useMemo(() => {
    if (!buildings) return [];
    return buildings.filter((b) => (b.release_year ?? 0) <= scrubYear);
  }, [buildings, scrubYear]);

  const filteredBuildings = useMemo(() => {
    return visibleBuildings.filter(
      (b) =>
        activeGenres.size === TOTAL_GENRES ||
        b.genres.some((gId) => activeGenres.has(GENRE_ID_TO_BUCKET[gId])),
    );
  }, [visibleBuildings, activeGenres]);

  const tasteProfile = useMemo(() => {
    if (!buildings || !watchedStore || watchedCount < 5) return null;
    return computeTasteProfile(buildings, watchedStore);
  }, [buildings, watchedStore, watchedCount]);

  // Build the Set<number> passed to the renderer — only recreated when count changes
  const watchedIds = useMemo(() => {
    if (!watchedStore) return undefined;
    return new Set(watchedStore.watched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCount]);

  const closeModal = useCallback(() => {
    setSelectedBuilding(null);
    setMovieDetail(null);
    setDetailLoading(false);
  }, []);

  const openModal = useCallback((building: CityBuilding) => {
    setSelectedBuilding(building);
    setMovieDetail(null);
    setDetailLoading(true);
  }, []);

  const handleFlyComplete = useCallback(() => {
    if (pendingHoverRef.current) {
      setHoveredBuilding(pendingHoverRef.current);
      pendingHoverRef.current = null;
    }
  }, []);

  const handleSearchSelect = useCallback((building: CityBuilding) => {
    pendingHoverRef.current = building;
    canvasRef.current?.flyTo(building.x, building.z);
  }, []);

  const handleThemeChange = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(3, index));
    setActiveTheme(clamped);
    localStorage.setItem("cinecity_theme", String(clamped));
  }, []);

  const handleScreenshot = useCallback(async () => {
    setScreenshotMode(true);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    try {
      const raw = canvasRef.current?.captureScreenshot();
      if (!raw) return;

      const dataUrl = await compositeLetterbox(raw, scrubYear);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `cinecity-${scrubYear}.png`;
      link.click();

      setToastVisible(true);
      window.setTimeout(() => setToastVisible(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setScreenshotMode(false);
    }
  }, [scrubYear]);

  // Called by WatchedButton after any toggle — forces re-render of ghost buildings
  const handleWatchedToggle = useCallback(() => {
    if (!watchedStore) return;
    setWatchedCount(getWatchedCount(watchedStore));
  }, [watchedStore]);

  // Load watched store from localStorage on mount
  useEffect(() => {
    const store = loadStore();
    setWatchedStore(store);
    setWatchedCount(getWatchedCount(store));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/movies");
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to load movies (${res.status})`);
        }
        const data = (await res.json()) as CityBuilding[];
        if (!cancelled) {
          setBuildings(
            data.map((b) => ({
              ...b,
              custom_color: b.color,
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load movies");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedBuilding) return;

    let cancelled = false;
    const movieId = selectedBuilding.movieId;

    async function loadDetail() {
      try {
        const url = new URL(`https://api.themoviedb.org/3/movie/${movieId}`);
        url.searchParams.set("api_key", getApiKey());
        url.searchParams.set("append_to_response", "videos,credits,watch/providers");

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error(`TMDB movie fetch failed (${res.status})`);
        }
        const data = (await res.json()) as TmdbMovieDetail;
        if (!cancelled) setMovieDetail(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedBuilding]);

  if (error) {
    return (
      <p className="fixed inset-0 flex items-center justify-center font-mono text-sm text-red-400">
        {error}
      </p>
    );
  }

  if (!buildings) {
    return (
      <p className="fixed inset-0 flex items-center justify-center font-mono text-sm text-neutral-400">
        Building city...
      </p>
    );
  }

  const showUi = !screenshotMode;

  return (
    <div style={shell}>
      {showUi && !flyMode ? (
        <SearchBar buildings={buildings} onSelect={handleSearchSelect} />
      ) : null}

      {showUi ? (
        <div
          style={{
            ...flyBtnWrap,
            left: flyMode ? "50%" : "calc(50% + 176px)",
            transform: flyMode ? "translateX(-50%)" : undefined,
          }}
        >
          <button
            type="button"
            style={{ ...flyBtn, ...(flyMode ? flyBtnActive : {}) }}
            onClick={toggleFlyMode}
            aria-pressed={flyMode}
          >
            FLY
          </button>
        </div>
      ) : null}

      {showUi && flyMode ? (
        <div style={flyHudWrap} aria-live="polite">
          <div style={flyHudStatRow}>
            <span>
              SPD {flyHud.speed.toFixed(1)}
            </span>
            <span style={flyHudBarTrack} aria-hidden>
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${Math.min(100, (flyHud.speed / 7.5) * 100)}%`,
                  background: "#a8d8a0",
                  borderRadius: 2,
                }}
              />
            </span>
          </div>
          <div>ALT {Math.round(flyHud.altitude)}</div>
          <div style={flyHudHelp}>
            <div>MOUSE STEER</div>
            <div>SHIFT BOOST</div>
            <div>ALT SLOW</div>
            <div>SCROLL SPEED</div>
            <div>R RETURN TO CITY</div>
            <div>ESC EXIT</div>
          </div>
        </div>
      ) : null}

      {showUi ? (
        <GenreFilterPanel activeGenres={activeGenres} onChange={setActiveGenres} />
      ) : null}

      <CityCanvas
        ref={canvasRef}
        buildings={filteredBuildings}
        themeIndex={activeTheme}
        watchedIds={watchedIds}
        flyMode={flyMode}
        onExitFlyMode={handleExitFlyMode}
        onFlyHud={handleFlyHud}
        onBuildingHover={setHoveredBuilding}
        onBuildingClick={openModal}
        onFlyComplete={handleFlyComplete}
      />

      {screenshotMode ? <LetterboxOverlay scrubYear={scrubYear} /> : null}

      {showUi ? (
        <div style={screenshotBtnWrap}>
          <button
            type="button"
            style={screenshotBtn}
            onClick={() => void handleScreenshot()}
            aria-label="Save screenshot"
          >
            <CameraIcon />
          </button>
        </div>
      ) : null}

      {showUi ? (
        <YearScrubber
        year={scrubYear}
        filmCount={filteredBuildings.length}
        onChange={setScrubYear}
        />
      ) : null}

      {showUi ? (
        <div
          style={{
            ...hoverCardStyle,
          opacity: hoveredBuilding && !selectedBuilding ? 1 : 0,
        }}
        aria-hidden={!hoveredBuilding || !!selectedBuilding}
      >
        {hoveredBuilding && !selectedBuilding ? (
          <HoverCard building={hoveredBuilding} />
        ) : null}
        </div>
      ) : null}

      {showUi && selectedBuilding && watchedStore ? (
        <MovieModal
          building={selectedBuilding}
          detail={movieDetail}
          loading={detailLoading}
          store={watchedStore}
          onClose={closeModal}
          onWatchedToggle={handleWatchedToggle}
        />
      ) : null}

      {showUi ? (
        <div style={counterStyle}>
        <span style={{ color: "#4ade80", fontWeight: 700 }}>{watchedCount}</span>{" "}
        building{watchedCount !== 1 ? "s" : ""} explored
        </div>
      ) : null}

      {showUi ? (
        <ThemeSwitcher active={activeTheme} onChange={handleThemeChange} />
      ) : null}

      {showUi && tasteProfile ? (
        <div style={tastePanelWrap}>
          <TasteHexagonPanel
            profile={tasteProfile}
            explored={watchedCount}
            total={buildings.length}
            collapsed={tasteCollapsed}
            onToggle={() => setTasteCollapsed((c) => !c)}
          />
        </div>
      ) : null}

      {toastVisible ? <div style={toastStyle}>Screenshot saved</div> : null}
    </div>
  );
}
