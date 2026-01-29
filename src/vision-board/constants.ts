// Poster dimensions
export const POSTER_WIDTH = 1800;
export const POSTER_HEIGHT = 2400;
export const MIN_DIM = Math.min(POSTER_WIDTH, POSTER_HEIGHT);
export const DREAM_BASE_SIZE = MIN_DIM * 0.38;
export const CORE_BASE_SIZE = MIN_DIM * 0.48;

// Dream positions - 14 preset positions around the board
export const DREAM_POSITIONS = [
  { x: -0.32, y: -0.38, size: 1.15 },
  { x: 0.0, y: -0.40, size: 1.1 },
  { x: 0.32, y: -0.38, size: 1.15 },
  { x: -0.38, y: -0.18, size: 1.1 },
  { x: 0.38, y: -0.16, size: 1.05 },
  { x: -0.40, y: 0.08, size: 1.15 },
  { x: 0.40, y: 0.06, size: 1.1 },
  { x: -0.38, y: 0.30, size: 1.05 },
  { x: 0.38, y: 0.28, size: 1.1 },
  { x: -0.32, y: 0.42, size: 1.15 },
  { x: 0.0, y: 0.44, size: 1.1 },
  { x: 0.32, y: 0.42, size: 1.15 },
  { x: -0.22, y: -0.28, size: 0.95 },
  { x: 0.22, y: 0.28, size: 0.95 },
];

// Seeded random for consistent positions
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};
