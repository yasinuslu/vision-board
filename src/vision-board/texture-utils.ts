import { Texture } from "pixi.js";

// Create faded circular texture from an image URL
// zoom: 1.0 = fit to cover, >1.0 = zoom in (crop), <1.0 = zoom out (show more)
export const createFadedTexture = async (
  imageUrl: string,
  size: number,
  zoom: number = 1.0
): Promise<Texture> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;

      // Base scale to cover the canvas
      const baseScale = size / Math.min(img.width, img.height);
      // Apply zoom (higher zoom = more cropped/zoomed in)
      const scale = baseScale * zoom;
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;

      ctx.drawImage(img, x, y, w, h);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      const centerX = size / 2;
      const centerY = size / 2;
      const maxRadius = size / 2;

      // Calculate image bounds for edge feathering
      const imgLeft = x;
      const imgRight = x + w;
      const imgTop = y;
      const imgBottom = y + h;
      const featherSize = size * 0.08; // 8% feather at edges

      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const idx = (py * size + px) * 4;
          
          // Circular fade (radial from center)
          const dist = Math.sqrt((px - centerX) ** 2 + (py - centerY) ** 2);
          const ratio = dist / maxRadius;

          let circularAlpha;
          if (ratio < 0.4) {
            circularAlpha = 1;
          } else if (ratio > 1) {
            circularAlpha = 0;
          } else {
            const t = (ratio - 0.4) / 0.6;
            circularAlpha = 1 - t * t * (3 - 2 * t);
          }

          // Edge feathering for rectangular image bounds
          // This smoothly fades the image edges when zoomed out
          let edgeAlpha = 1;
          if (featherSize > 0) {
            // Distance from each edge (negative means outside image)
            const fromLeft = px - imgLeft;
            const fromRight = imgRight - px;
            const fromTop = py - imgTop;
            const fromBottom = imgBottom - py;

            // Find minimum distance to any edge
            const minEdgeDist = Math.min(fromLeft, fromRight, fromTop, fromBottom);

            if (minEdgeDist < 0) {
              // Outside the image
              edgeAlpha = 0;
            } else if (minEdgeDist < featherSize) {
              // Smooth fade near edges
              const t = minEdgeDist / featherSize;
              edgeAlpha = t * t * (3 - 2 * t); // Smoothstep
            }
          }

          // Combine both alpha values
          const finalAlpha = circularAlpha * edgeAlpha;
          data[idx + 3] = Math.floor((data[idx + 3] ?? 0) * finalAlpha);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(Texture.from(canvas));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};
