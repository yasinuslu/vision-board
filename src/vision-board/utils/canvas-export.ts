import { Application } from '@pixi/react';

/**
 * Exports the PixiJS canvas as a high-quality image.
 * Uses 2x resolution for print-quality output (3600×4800px).
 *
 * @param app - The PixiJS Application instance
 * @param filename - The filename for the downloaded image (default: 'vision-board.png')
 */
export async function exportCanvasAsImage(
  app: Application | null,
  filename: string = 'vision-board.png',
): Promise<void> {
  if (!app) {
    console.error('Application instance is null');
    return;
  }

  // Extract canvas at 2x resolution for high-quality prints
  // Original canvas: 1800×2400 → Export: 3600×4800
  const canvas = app.renderer.extract.canvas({
    resolution: 2,
    antialias: true,
  });

  if (!canvas) {
    console.error('Failed to extract canvas');
    return;
  }

  // Convert to blob for better quality than toDataURL
  canvas.toBlob(
    (blob) => {
      // Create temporary URL and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      // Clean up the blob URL to free memory
      setTimeout(() => URL.revokeObjectURL(url), 100);
    },
    'image/png',
    // High quality (1.0 = maximum)
    1.0
  );
}
