// Shared types for the Vision Board application

export interface SlotConfig {
  image: string | null;
  size: number; // 0.5 - 2.0, default 1
  zoom: number; // 0.5 - 3.0, default 1 - zoom into the image within the slot
  opacity: number; // 0 - 1, default 1
  blur: number; // 0 - 20, default 0
  glowIntensity: number; // 0 - 2, default 0.25
  offsetX: number; // -200 to 200, default 0
  offsetY: number; // -200 to 200, default 0
  rotation: number; // -180 to 180 degrees, default 0
  saturation: number; // 0 - 2, default 1
  brightness: number; // 0 - 2, default 1
  contrast: number; // 0 - 2, default 1
  positionIndex: number; // 0-13, which of the 14 preset positions this slot uses
}

export const DEFAULT_SLOT_CONFIG: SlotConfig = {
  image: null,
  size: 1.0,
  zoom: 1.0,
  opacity: 1.0,
  blur: 0,
  glowIntensity: 0.25,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  saturation: 1.0,
  brightness: 1.0,
  contrast: 1.0,
  positionIndex: 0,
};

// Create a slot config for a specific position
export const createSlotConfig = (positionIndex: number): SlotConfig => ({
  ...DEFAULT_SLOT_CONFIG,
  positionIndex,
});

// Total available dream positions
export const TOTAL_DREAM_POSITIONS = 14;

export interface Config {
  core: SlotConfig;
  dreams: SlotConfig[];
}

// Helper to check if slot has any non-default effects
export const hasCustomEffects = (config: SlotConfig): boolean => {
  return (
    config.size !== DEFAULT_SLOT_CONFIG.size ||
    config.zoom !== DEFAULT_SLOT_CONFIG.zoom ||
    config.opacity !== DEFAULT_SLOT_CONFIG.opacity ||
    config.blur !== DEFAULT_SLOT_CONFIG.blur ||
    config.glowIntensity !== DEFAULT_SLOT_CONFIG.glowIntensity ||
    config.offsetX !== DEFAULT_SLOT_CONFIG.offsetX ||
    config.offsetY !== DEFAULT_SLOT_CONFIG.offsetY ||
    config.rotation !== DEFAULT_SLOT_CONFIG.rotation ||
    config.saturation !== DEFAULT_SLOT_CONFIG.saturation ||
    config.brightness !== DEFAULT_SLOT_CONFIG.brightness ||
    config.contrast !== DEFAULT_SLOT_CONFIG.contrast
  );
};

// Helper to get effects only (without image)
export const getEffectsOnly = (config: SlotConfig): Omit<SlotConfig, 'image'> => {
  const { image, ...effects } = config;
  return effects;
};

// Helper to reset effects to defaults (keeping image and positionIndex)
export const resetEffects = (config: SlotConfig): SlotConfig => {
  return {
    ...DEFAULT_SLOT_CONFIG,
    image: config.image,
    positionIndex: config.positionIndex,
  };
};

// Helper to apply a preset (resets to defaults first, then applies preset)
export const applyPreset = (config: SlotConfig, preset: EffectPreset): SlotConfig => {
  return {
    ...DEFAULT_SLOT_CONFIG,
    image: config.image,
    positionIndex: config.positionIndex,
    ...preset.effects,
  };
};

// Effect presets for quick application
export interface EffectPreset {
  name: string;
  description: string;
  effects: Partial<Omit<SlotConfig, 'image'>>;
}

// Canvas export function type
export type CanvasExportFn = (filename?: string) => Promise<void>;

export const EFFECT_PRESETS: EffectPreset[] = [
  {
    name: "Dreamy",
    description: "Soft, ethereal look",
    effects: { blur: 3, glowIntensity: 0.6, saturation: 0.85, brightness: 1.1 },
  },
  {
    name: "Vibrant",
    description: "Bold and colorful",
    effects: { saturation: 1.4, contrast: 1.2, brightness: 1.05, glowIntensity: 0.4 },
  },
  {
    name: "Moody",
    description: "Dark and dramatic",
    effects: { brightness: 0.85, contrast: 1.3, saturation: 0.7, glowIntensity: 0.15 },
  },
  {
    name: "Ethereal Glow",
    description: "Strong mystical aura",
    effects: { glowIntensity: 1.2, blur: 2, brightness: 1.1, opacity: 0.95 },
  },
  {
    name: "Subtle",
    description: "Understated presence",
    effects: { opacity: 0.7, size: 0.85, glowIntensity: 0.15 },
  },
  {
    name: "Bold Center",
    description: "Prominent and large",
    effects: { size: 1.3, glowIntensity: 0.5, contrast: 1.1 },
  },
];
