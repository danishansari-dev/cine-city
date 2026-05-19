"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CityBuilding } from "@/lib/city";

/**
 * Performance-friendly building labels using canvas-texture sprites.
 * Only labels within LABEL_SHOW_DIST of the camera are rendered,
 * keeping the GPU budget sane even with hundreds of buildings.
 */

// Distance threshold: labels beyond this are hidden to avoid clutter
const LABEL_SHOW_DIST = 120;
// Fade range: labels start fading out between FADE_START and SHOW_DIST
const LABEL_FADE_START = 90;

// Canvas dimensions for label texture — wide enough for long titles
const CANVAS_W = 512;
const CANVAS_H = 64;

// Reusable Vector3 to avoid per-frame allocations
const _camPos = new THREE.Vector3();
const _bldgPos = new THREE.Vector3();

/**
 * Renders text to a canvas and creates a sprite texture.
 * @param text - The label string (e.g. "Inception (2010)")
 * @returns {THREE.SpriteMaterial} Material with the baked text texture
 */
function createLabelMaterial(text: string): THREE.SpriteMaterial {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;

  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Configure font — bold, clean, readable at distance
  ctx.font = "bold 28px 'Inter', 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Text shadow for depth/readability against any background
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Draw white text
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W - 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Keep text crisp
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    // Start invisible — useFrame controls visibility
    opacity: 0,
    fog: true,
  });
}

/**
 * Formats the building title for the label.
 * Shows "Title (Year)" if year is available, otherwise just "Title".
 */
function formatLabel(building: CityBuilding): string {
  const year = building.release_year;
  if (year && year > 0) {
    return `${building.title} (${year})`;
  }
  return building.title;
}

interface BuildingLabelsProps {
  buildings: CityBuilding[];
}

/**
 * Renders floating name labels above each building in the city.
 * Labels use canvas-baked sprite textures for maximum performance.
 * Only labels within camera proximity are visible to prevent clutter.
 */
export default function BuildingLabels({ buildings }: BuildingLabelsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Track previous building set to dispose old textures properly
  const prevMaterialsRef = useRef<THREE.SpriteMaterial[]>([]);

  // Build sprite data — one material + position per building
  const spriteData = useMemo(() => {
    return buildings
      .filter((b) => b.title && b.title.length > 0)
      .map((b) => ({
        building: b,
        label: formatLabel(b),
        // Position label just above the building rooftop
        x: b.position[0],
        y: b.height + 4,
        z: b.position[2],
      }));
  }, [buildings]);

  // Create materials lazily and cache them
  const materials = useMemo(() => {
    return spriteData.map((d) => createLabelMaterial(d.label));
  }, [spriteData]);

  // Cleanup old materials when buildings change
  useEffect(() => {
    const prev = prevMaterialsRef.current;
    return () => {
      for (const mat of prev) {
        mat.map?.dispose();
        mat.dispose();
      }
    };
  }, [materials]);

  // Store current materials for future cleanup
  useEffect(() => {
    prevMaterialsRef.current = materials;
  }, [materials]);

  // Per-frame: show/hide labels based on camera distance + fade
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    _camPos.copy(camera.position);

    const children = group.children;
    for (let i = 0; i < children.length; i++) {
      const sprite = children[i] as THREE.Sprite;
      const mat = sprite.material as THREE.SpriteMaterial;
      const data = spriteData[i];
      if (!data) continue;

      _bldgPos.set(data.x, data.y, data.z);
      const dist = _camPos.distanceTo(_bldgPos);

      if (dist > LABEL_SHOW_DIST) {
        // Beyond threshold — hide completely
        mat.opacity = 0;
        sprite.visible = false;
      } else {
        sprite.visible = true;
        if (dist > LABEL_FADE_START) {
          // Fade out smoothly between FADE_START and SHOW_DIST
          const t = (dist - LABEL_FADE_START) / (LABEL_SHOW_DIST - LABEL_FADE_START);
          mat.opacity = 1 - t;
        } else {
          mat.opacity = 1;
        }
      }
    }
  });

  if (spriteData.length === 0) return null;

  // Scale factor — how large the sprite appears in world units
  const spriteScaleX = 20;
  const spriteScaleY = (CANVAS_H / CANVAS_W) * spriteScaleX;

  return (
    <group ref={groupRef}>
      {spriteData.map((data, i) => (
        <sprite
          key={data.building.id}
          position={[data.x, data.y, data.z]}
          scale={[spriteScaleX, spriteScaleY, 1]}
          material={materials[i]}
        />
      ))}
    </group>
  );
}
