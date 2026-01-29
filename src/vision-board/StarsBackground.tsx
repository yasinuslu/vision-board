import { memo, useMemo, useCallback } from "react";
import { BlurFilter } from "pixi.js";
import { POSTER_WIDTH, POSTER_HEIGHT, MIN_DIM, seededRandom } from "./constants";

// Stars background component - optimized to use single draw calls
export const StarsBackground = memo(function StarsBackground() {
  // Reduced star count and use seeded random for consistency
  const starCount = 500;

  // Generate stars data once
  const starsData = useMemo(() => {
    const stars: { x: number; y: number; radius: number; alpha: number }[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: seededRandom(i * 3) * POSTER_WIDTH,
        y: seededRandom(i * 5) * POSTER_HEIGHT,
        radius: seededRandom(i * 7) * 1.5 + 0.5,
        alpha: seededRandom(i * 11) * 0.6 + 0.2,
      });
    }
    return stars;
  }, []);

  // Generate nebulae data once
  const nebulaeData = useMemo(() => {
    const colors = [0x0f0520, 0x081020, 0x0a0a1a, 0x100820, 0x0a1020];
    const nebulae: { x: number; y: number; radius: number; color: number }[] = [];
    for (let i = 0; i < 6; i++) {
      nebulae.push({
        x: seededRandom(i * 17 + 100) * POSTER_WIDTH,
        y: seededRandom(i * 19 + 100) * POSTER_HEIGHT,
        radius: seededRandom(i * 23 + 100) * MIN_DIM * 0.25 + MIN_DIM * 0.12,
        color: colors[i % colors.length]!,
      });
    }
    return nebulae;
  }, []);

  const blurFilter = useMemo(() => new BlurFilter({ strength: 60, quality: 4 }), []);

  // Stable draw callbacks
  const drawStars = useCallback((g: any) => {
    g.clear();
    for (const star of starsData) {
      g.circle(star.x, star.y, star.radius);
      g.fill({ color: 0xffffff, alpha: star.alpha });
    }
  }, [starsData]);

  const drawNebulae = useCallback((g: any) => {
    g.clear();
    for (const nebula of nebulaeData) {
      g.circle(nebula.x, nebula.y, nebula.radius);
      g.fill({ color: nebula.color, alpha: 0.4 });
    }
  }, [nebulaeData]);

  return (
    <pixiContainer>
      {/* All nebulae in one draw call */}
      <pixiGraphics filters={[blurFilter]} draw={drawNebulae} />
      {/* All stars in one draw call */}
      <pixiGraphics draw={drawStars} />
    </pixiContainer>
  );
});
