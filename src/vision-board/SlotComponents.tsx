import { memo, useMemo, useCallback } from "react";
import { BlurFilter, ColorMatrixFilter } from "pixi.js";
import type { SlotConfig } from "../types";
import { useFadedTexture } from "./hooks";
import {
  POSTER_WIDTH,
  POSTER_HEIGHT,
  DREAM_BASE_SIZE,
  CORE_BASE_SIZE,
  DREAM_POSITIONS,
  seededRandom,
} from "./constants";

// Highlight ring component (static, no animation to avoid re-renders)
export const HighlightRing = memo(function HighlightRing({
  radius,
  visible,
}: {
  radius: number;
  visible: boolean;
}) {
  const drawRing = useCallback(
    (g: any) => {
      g.clear();
      // Outer glow ring
      g.circle(0, 0, radius + 20);
      g.stroke({ color: 0x3b82f6, width: 4, alpha: 0.25 });
      // Main ring
      g.circle(0, 0, radius + 12);
      g.stroke({ color: 0x3b82f6, width: 5, alpha: 0.5 });
      // Inner bright ring
      g.circle(0, 0, radius + 8);
      g.stroke({ color: 0x60a5fa, width: 2, alpha: 0.8 });
    },
    [radius],
  );

  if (!visible) return null;

  return <pixiGraphics zIndex={1000} draw={drawRing} />;
});

// Empty slot placeholder
export const EmptySlotPlaceholder = memo(function EmptySlotPlaceholder({
  radius,
  isCore,
}: {
  radius: number;
  isCore?: boolean;
}) {
  const drawPlaceholder = useCallback(
    (g: any) => {
      g.clear();
      g.circle(0, 0, radius);
      g.stroke({ color: isCore ? 0x6366f1 : 0x4a5568, width: isCore ? 3 : 2 });
      g.fill({ color: 0x1a1a2a, alpha: isCore ? 0.4 : 0.3 });
      if (isCore) {
        g.circle(0, 0, 30);
        g.fill({ color: 0x6366f1, alpha: 0.3 });
      }
    },
    [radius, isCore],
  );

  return <pixiGraphics draw={drawPlaceholder} />;
});

// Image slot component with loaded textures
export const ImageSlot = memo(function ImageSlot({
  imageId,
  baseSize,
  slotConfig,
  isCore,
}: {
  imageId: string;
  baseSize: number;
  slotConfig: SlotConfig;
  isCore?: boolean;
}) {
  const sizeMultiplier = slotConfig.size || 1;
  const zoom = slotConfig.zoom ?? 1;
  const size = baseSize * sizeMultiplier;
  const mainTexture = useFadedTexture(
    imageId,
    Math.floor(size * (isCore ? 1.2 : 1.1)),
    zoom,
  );
  const glowTexture = useFadedTexture(
    imageId,
    Math.floor(size * (isCore ? 1.8 : 1.5)),
    zoom,
  );

  // Glow blur filter - stable reference
  const glowFilter = useMemo(
    () =>
      new BlurFilter({ strength: isCore ? 30 : 18, quality: isCore ? 6 : 5 }),
    [isCore],
  );

  // Main image blur filter
  const blurAmount = slotConfig.blur || 0;
  const imageBlurFilter = useMemo(
    () => new BlurFilter({ strength: blurAmount, quality: 4 }),
    [blurAmount],
  );

  // Color values for filter
  const saturation = slotConfig.saturation ?? 1;
  const brightness = slotConfig.brightness ?? 1;
  const contrast = slotConfig.contrast ?? 1;

  // Color adjustments filter
  const colorFilter = useMemo(() => {
    const filter = new ColorMatrixFilter();
    if (saturation !== 1) filter.saturate(saturation - 1, false);
    if (brightness !== 1) filter.brightness(brightness, false);
    if (contrast !== 1) filter.contrast(contrast, false);
    return filter;
  }, [saturation, brightness, contrast]);

  // Check if filters are needed
  const needsBlur = blurAmount > 0;
  const needsColor = saturation !== 1 || brightness !== 1 || contrast !== 1;

  // Build filters array
  const mainFilters = useMemo(() => {
    if (!needsBlur && !needsColor) return undefined;
    const filters: any[] = [];
    if (needsBlur) filters.push(imageBlurFilter);
    if (needsColor) filters.push(colorFilter);
    return filters;
  }, [needsBlur, needsColor, imageBlurFilter, colorFilter]);

  if (!mainTexture || !glowTexture) {
    return <EmptySlotPlaceholder radius={baseSize / 2} isCore={isCore} />;
  }

  // Calculate glow alpha
  const baseGlowAlpha = isCore ? 0.35 : 0.25;
  const glowAlpha = baseGlowAlpha * (slotConfig.glowIntensity / 0.25);

  return (
    <pixiContainer scale={sizeMultiplier} alpha={slotConfig.opacity}>
      <pixiSprite
        texture={glowTexture}
        anchor={0.5}
        alpha={glowAlpha}
        filters={[glowFilter]}
        zIndex={-1}
      />
      <pixiSprite
        texture={mainTexture}
        anchor={0.5}
        zIndex={1}
        filters={mainFilters}
      />
    </pixiContainer>
  );
});

// Core slot component
export const CoreSlot = memo(function CoreSlot({
  config,
  isSelected,
  onClick,
}: {
  config: SlotConfig;
  isSelected: boolean;
  onClick: () => void;
}) {
  const handlePointerDown = useCallback(() => onClick(), [onClick]);

  // Apply offset and rotation from config
  const offsetX = config.offsetX || 0;
  const offsetY = config.offsetY || 0;
  const rotationDeg = config.rotation || 0;
  const rotationRad = (rotationDeg * Math.PI) / 180;

  return (
    <pixiContainer
      x={offsetX}
      y={offsetY}
      rotation={rotationRad}
      zIndex={500}
      sortableChildren
      eventMode="static"
      cursor="pointer"
      onPointerDown={handlePointerDown}
    >
      {config.image ? (
        <ImageSlot
          imageId={config.image}
          baseSize={CORE_BASE_SIZE}
          slotConfig={config}
          isCore
        />
      ) : (
        <EmptySlotPlaceholder radius={CORE_BASE_SIZE / 2} isCore />
      )}
      <HighlightRing
        radius={CORE_BASE_SIZE * 0.6 * (config.size || 1)}
        visible={isSelected}
      />
    </pixiContainer>
  );
});

// Dream slot component
export const DreamSlot = memo(function DreamSlot({
  index,
  config,
  isSelected,
  onClick,
}: {
  index: number;
  config: SlotConfig;
  isSelected: boolean;
  onClick: () => void;
}) {
  const pos = DREAM_POSITIONS[index];
  if (!pos) return null;

  const posMultiplier = pos.size * (0.8 + seededRandom(index * 17) * 0.4);
  const baseSlotSize = DREAM_BASE_SIZE * posMultiplier;

  // Base position from preset
  const baseX =
    pos.x * POSTER_WIDTH +
    (seededRandom(index * 7) - 0.5) * POSTER_WIDTH * 0.04;
  const baseY =
    pos.y * POSTER_HEIGHT +
    (seededRandom(index * 13) - 0.5) * POSTER_HEIGHT * 0.04;

  // Apply offset from config
  const x = baseX + (config.offsetX || 0);
  const y = baseY + (config.offsetY || 0);

  // Base rotation from seeded random + config rotation
  const baseRotation = (seededRandom(index * 23) - 0.5) * 0.9;
  const configRotationRad = ((config.rotation || 0) * Math.PI) / 180;
  const rotation = baseRotation + configRotationRad;

  const handlePointerDown = useCallback(() => onClick(), [onClick]);

  return (
    <pixiContainer
      x={x}
      y={y}
      rotation={rotation}
      zIndex={isSelected ? 200 + index : 50 + index}
      sortableChildren
      eventMode="static"
      cursor="pointer"
      onPointerDown={handlePointerDown}
    >
      {config.image ? (
        <ImageSlot
          imageId={config.image}
          baseSize={baseSlotSize}
          slotConfig={config}
        />
      ) : (
        <EmptySlotPlaceholder radius={baseSlotSize / 2} />
      )}
      <HighlightRing
        radius={(baseSlotSize / 2) * (config.size || 1)}
        visible={isSelected}
      />
    </pixiContainer>
  );
});
