import { Application, Container, RenderTexture } from 'pixi.js';
import { POSTER_WIDTH, POSTER_HEIGHT } from '../constants';

// Fixed export resolution for high-quality prints
const EXPORT_WIDTH = 5400;
const EXPORT_HEIGHT = 7200;

/**
 * Recursively hides HUD elements (high zIndex elements like selection rings)
 * Returns a list of hidden elements to restore later
 */
function hideHudElements(container: Container): Container[] {
  const hidden: Container[] = [];
  
  for (const child of container.children) {
    // Hide selection rings (they have zIndex >= 1000)
    if (child.zIndex >= 1000 && child.visible) {
      child.visible = false;
      hidden.push(child as Container);
    }
    
    // Recursively check children
    if (child instanceof Container && child.children.length > 0) {
      hidden.push(...hideHudElements(child as Container));
    }
  }
  
  return hidden;
}

/**
 * Restores previously hidden HUD elements
 */
function restoreHudElements(elements: Container[]): void {
  for (const element of elements) {
    element.visible = true;
  }
}

/**
 * Exports the PixiJS canvas as a high-quality image.
 * Creates an off-screen renderer at fixed 5400x7200 resolution for print-quality output.
 * HUD elements (selection rings, etc.) are hidden during export.
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

  try {
    // Calculate scale factor from poster size to export size
    const scaleX = EXPORT_WIDTH / POSTER_WIDTH;
    const scaleY = EXPORT_HEIGHT / POSTER_HEIGHT;
    
    // Create render texture at fixed high resolution
    const renderTexture = RenderTexture.create({
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      resolution: 1,
    });

    // Hide HUD elements (selection rings, etc.)
    const hiddenElements = hideHudElements(app.stage);

    // Save original stage scale and position
    const originalScaleX = app.stage.scale.x;
    const originalScaleY = app.stage.scale.y;
    const originalX = app.stage.x;
    const originalY = app.stage.y;

    // Scale the stage for high-resolution rendering
    app.stage.scale.set(scaleX, scaleY);
    app.stage.position.set(0, 0);

    // Render the stage to the high-resolution texture
    app.renderer.render({
      container: app.stage,
      target: renderTexture,
      clear: true,
    });

    // Restore original stage transform
    app.stage.scale.set(originalScaleX, originalScaleY);
    app.stage.position.set(originalX, originalY);

    // Restore HUD elements
    restoreHudElements(hiddenElements);

    // Extract the render texture as a canvas
    const canvas = app.renderer.extract.canvas({
      target: renderTexture,
    }) as HTMLCanvasElement;

    // Convert to blob and download
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error('Failed to create blob');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      },
      'image/png',
      1.0
    );

    // Clean up the render texture
    renderTexture.destroy(true);
    
  } catch (error) {
    console.error('Failed to export canvas:', error);
    throw error;
  }
}
