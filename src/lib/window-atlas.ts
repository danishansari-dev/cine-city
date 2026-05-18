import * as THREE from "three";

export interface BuildingColors {
  windowLit: string[];
  windowOff: string;
  face: string;
  roof: string;
  accent: string;
}

const ATLAS_SIZE = 2048;
const ATLAS_CELL = 8;
const ATLAS_COLS = ATLAS_SIZE / ATLAS_CELL;
const ATLAS_BAND_ROWS = 42;
const ATLAS_LIT_PCTS = [0.2, 0.35, 0.5, 0.65, 0.8, 0.95];

function colorToABGR(hex: string): number {
  const c = new THREE.Color(hex);
  return (
    255 << 24 |
    (Math.round(c.b * 255) << 16) |
    (Math.round(c.g * 255) << 8) |
    Math.round(c.r * 255)
  );
}

export function createWindowAtlas(colors: BuildingColors): THREE.CanvasTexture {
  const WS = 6;
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext("2d")!;

  const imageData = ctx.createImageData(ATLAS_SIZE, ATLAS_SIZE);
  const buf32 = new Uint32Array(imageData.data.buffer);

  const faceABGR = colorToABGR(colors.face);
  const litABGRs = colors.windowLit.map(colorToABGR);
  const offABGR = colorToABGR(colors.windowOff);

  buf32.fill(faceABGR);

  let s = 42;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let band = 0; band < ATLAS_LIT_PCTS.length; band++) {
    const litPct = ATLAS_LIT_PCTS[band];
    const bandStart = band * ATLAS_BAND_ROWS;
    for (let r = 0; r < ATLAS_BAND_ROWS; r++) {
      const rowY = (bandStart + r) * ATLAS_CELL;
      for (let c = 0; c < ATLAS_COLS; c++) {
        const px = c * ATLAS_CELL;
        const abgr =
          rand() < litPct
            ? litABGRs[Math.floor(rand() * litABGRs.length)]
            : offABGR;
        for (let dy = 0; dy < WS; dy++) {
          const rowOffset = (rowY + dy) * ATLAS_SIZE + px;
          for (let dx = 0; dx < WS; dx++) {
            buf32[rowOffset + dx] = abgr;
          }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
