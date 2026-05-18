/** Building record for the instanced city renderer. */

export interface CityBuilding {
  id: string;
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  movieId: number;
  title: string;
  posterPath: string;
  voteAverage: number;
  genres: number[];
  release_date?: string;
  /** Parsed year from release_date — used for the year scrubber. */
  release_year: number;
  /** World position (y is ground level). */
  position: [number, number, number];
  floors: number;
  windowsPerFloor: number;
  sideWindowsPerFloor: number;
  litPercentage: number;
  custom_color?: string | null;
  /** Set at render time from the user's watch store. */
  watched?: boolean;
}

export function spiralGridPosition(
  index: number,
  gridSize: number,
): { x: number; z: number } {
  const [gx, gz] = spiralCoord(index);
  return { x: gx * gridSize, z: gz * gridSize };
}

function spiralCoord(index: number): [number, number] {
  if (index === 0) return [0, 0];

  let x = 0;
  let y = 0;
  let dx = 1;
  let dy = 0;
  let segLen = 1;
  let segPassed = 0;
  let turns = 0;

  for (let i = 0; i < index; i++) {
    x += dx;
    y += dy;
    segPassed++;
    if (segPassed === segLen) {
      segPassed = 0;
      const tmp = dx;
      dx = -dy;
      dy = tmp;
      turns++;
      if (turns % 2 === 0) segLen++;
    }
  }
  return [x, y];
}

function seededRand(seed: number): number {
  return ((seed * 16807) % 2147483647) / 2147483647;
}

/** Procedural placeholder city grid (no external data). */
export function generatePlaceholderCity(count = 256): CityBuilding[] {
  const BLOCK_SIZE = 4;
  const LOT_W = 38;
  const LOT_D = 32;
  const ALLEY_W = 3;
  const STREET_W = 12;
  const blockFootprintX = BLOCK_SIZE * LOT_W + (BLOCK_SIZE - 1) * ALLEY_W;
  const blockFootprintZ = BLOCK_SIZE * LOT_D + (BLOCK_SIZE - 1) * ALLEY_W;

  const buildings: CityBuilding[] = [];
  let idx = 0;
  let blockIdx = 0;

  while (idx < count) {
    const [bx, by] = spiralCoord(blockIdx);
    blockIdx++;

    const blockCenterX = bx * (blockFootprintX + STREET_W);
    const blockCenterZ = by * (blockFootprintZ + STREET_W);

    for (let r = 0; r < BLOCK_SIZE && idx < count; r++) {
      for (let c = 0; c < BLOCK_SIZE && idx < count; c++) {
        const offsetX = (c - (BLOCK_SIZE - 1) / 2) * LOT_W + (c > 0 ? ALLEY_W * c : 0);
        const offsetZ = (r - (BLOCK_SIZE - 1) / 2) * LOT_D + (r > 0 ? ALLEY_W * r : 0);

        const seed = (idx + 1) * 16807;
        const r1 = seededRand(seed);
        const r2 = seededRand(seed + 1);
        const r3 = seededRand(seed + 2);
        const r4 = seededRand(seed + 3);

        const height = 35 + r1 * 400;
        const width = 14 + r2 * 22;
        const depth = 12 + r3 * 18;
        const litPercentage = 0.15 + r4 * 0.8;
        const floors = Math.max(3, Math.floor(height / 6));
        const windowsPerFloor = Math.max(3, Math.floor(width / 5));
        const sideWindowsPerFloor = Math.max(2, Math.floor(depth / 5));

        const x = blockCenterX + offsetX;
        const z = blockCenterZ + offsetZ;

        buildings.push({
          id: `b-${idx}`,
          x,
          z,
          width,
          height,
          depth,
          color: "#6090e0",
          movieId: 0,
          title: "",
          posterPath: "",
          voteAverage: 0,
          genres: [],
          release_year: 2000,
          position: [x, 0, z],
          floors,
          windowsPerFloor,
          sideWindowsPerFloor,
          litPercentage,
          custom_color: null,
        });
        idx++;
      }
    }
  }

  return buildings;
}
