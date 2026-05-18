"use client";

import { useMemo, useEffect } from "react";
import { createWindowAtlas } from "@/lib/window-atlas";
import type { BuildingColors } from "@/lib/window-atlas";
import type { CityBuilding } from "@/lib/city";
import InstancedBuildings from "./InstancedBuildings";

interface CitySceneProps {
  buildings: CityBuilding[];
  colors: BuildingColors;
  /** Movie IDs the user has watched — passed to instanced renderer. */
  watchedIds?: Set<number>;
  onBuildingClick?: (building: CityBuilding) => void;
  onBuildingHover?: (building: CityBuilding | null) => void;
}

export default function CityScene({
  buildings,
  colors,
  watchedIds,
  onBuildingClick,
  onBuildingHover,
}: CitySceneProps) {
  const atlasTexture = useMemo(() => createWindowAtlas(colors), [colors]);

  useEffect(() => {
    return () => atlasTexture.dispose();
  }, [atlasTexture]);

  return (
    <InstancedBuildings
      buildings={buildings}
      colors={colors}
      atlasTexture={atlasTexture}
      watchedIds={watchedIds}
      onBuildingClick={onBuildingClick}
      onBuildingHover={onBuildingHover}
    />
  );
}
