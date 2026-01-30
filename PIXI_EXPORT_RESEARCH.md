# Pixi.js Canvas Export Research

## Overview
This document contains research findings and code examples for exporting/capturing a Pixi.js canvas as a high-quality image in this project.

## Current Setup
- **Pixi.js Version**: 8.15.0
- **React Wrapper**: @pixi/react 8.0.5
- **Component**: `Application` component from `@pixi/react`
- **Canvas Dimensions**: POSTER_WIDTH (1800) × POSTER_HEIGHT (2400)

---

## 1. Pixi.js Application/Renderer Methods for Capturing Canvas

### ExtractSystem (`renderer.extract`)

Pixi.js provides the **ExtractSystem** (accessed via `app.renderer.extract`) for exporting rendered content. This is the recommended method for high-quality exports.

#### Available Methods:
- **`canvas()`**: Extracts content as an `HTMLCanvasElement`
- **`base64()`**: Converts to base64 encoded string (uses `toDataURL` internally)
- **`image()`**: Exports as `HTMLImageElement`
- **`pixels()`**: Extracts raw pixel data as `Uint8Array`

#### Key Options for High Quality:
- **`resolution`**: Output resolution multiplier (e.g., `2` for 2x resolution, `3` for 3x)
- **`format`**: Image format (`'png'`, `'jpeg'`, `'webp'`)
- **`quality`**: Compression quality (0-1 scale, default 0.92 for JPEG/WebP)
- **`target`**: Specific container to extract (defaults to entire stage)

---

## 2. Best Practices for Exporting Canvas as Image

### Method 1: Using `renderer.extract.canvas()` + Native `toBlob()` (Recommended)

**Advantages:**
- Best quality control
- Can use native browser `toBlob()` for better performance
- Supports high-resolution exports via `resolution` parameter

```typescript
// High-quality export function
async function exportCanvasAsBlob(
  app: PIXI.Application,
  options?: {
    resolution?: number; // e.g., 2 for 2x resolution
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number; // 0-1, only for jpeg/webp
  }
): Promise<Blob> {
  const {
    resolution = 2, // 2x resolution for high quality
    format = 'png',
    quality = 0.92
  } = options || {};

  // Extract canvas at higher resolution
  const canvas = app.renderer.extract.canvas({
    resolution,
    // target: app.stage, // optional: extract specific container
  });

  // Convert to blob with quality settings
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      `image/${format}`,
      quality
    );
  });
}

// Usage
const blob = await exportCanvasAsBlob(app, {
  resolution: 2, // 2x = 3600×4800 pixels
  format: 'png',
});
const url = URL.createObjectURL(blob);
// Download or display the image
```

### Method 2: Using `renderer.extract.base64()` (Simpler, but less control)

**Advantages:**
- Simple one-line export
- Good for quick exports

**Disadvantages:**
- Less control over quality
- Base64 strings are larger than blobs

```typescript
// Simple base64 export
function exportCanvasAsBase64(
  app: PIXI.Application,
  resolution: number = 2
): string {
  return app.renderer.extract.base64({
    resolution,
    format: 'png',
  });
}

// Usage
const base64 = exportCanvasAsBase64(app, 2);
// Convert to blob if needed
const blob = await fetch(base64).then(r => r.blob());
```

### Method 3: Using `renderer.extract.image()` (For direct image element)

```typescript
// Export as HTMLImageElement
async function exportCanvasAsImage(
  app: PIXI.Application,
  resolution: number = 2
): Promise<HTMLImageElement> {
  return await app.renderer.extract.image({
    resolution,
    format: 'png',
  });
}

// Usage
const img = await exportCanvasAsImage(app, 2);
document.body.appendChild(img);
```

### Important: Enable `preserveDrawingBuffer`

For `toDataURL` and `toBlob` to work properly, you **must** set `preserveDrawingBuffer: true` in the Application options:

```typescript
<Application
  width={POSTER_WIDTH}
  height={POSTER_HEIGHT}
  backgroundColor={0x020208}
  antialias
  preserveDrawingBuffer={true} // REQUIRED for export
>
```

---

## 3. How to Get the PIXI Application Instance in @pixi/react

### Option 1: Using `useApp()` Hook (Recommended)

The `useApp()` hook provides access to the Application instance from any child component:

```typescript
import { useApp } from '@pixi/react';
import type { Application as PIXIApplication } from 'pixi.js';

// Inside a component that's a child of Application
function ExportButton() {
  const app = useApp() as PIXIApplication;
  
  const handleExport = async () => {
    const canvas = app.renderer.extract.canvas({ resolution: 2 });
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vision-board.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  };
  
  return <button onClick={handleExport}>Export</button>;
}

// Use inside Application
<Application>
  <VisionBoardScene />
  <ExportButton /> {/* Can access app via useApp() */}
</Application>
```

### Option 2: Using `onMount` Callback

The `Application` component accepts an `onMount` prop that provides the app instance:

```typescript
import { useState } from 'react';
import { Application } from '@pixi/react';
import type { Application as PIXIApplication } from 'pixi.js';

function VisionBoard() {
  const [app, setApp] = useState<PIXIApplication | null>(null);
  
  const handleExport = async () => {
    if (!app) return;
    
    const canvas = app.renderer.extract.canvas({ resolution: 2 });
    // ... export logic
  };
  
  return (
    <Application
      width={POSTER_WIDTH}
      height={POSTER_HEIGHT}
      backgroundColor={0x020208}
      antialias
      preserveDrawingBuffer={true}
      onMount={(appInstance) => {
        setApp(appInstance);
      }}
    >
      <VisionBoardScene />
    </Application>
  );
}
```

### Option 3: Using Ref with Application Component

Note: The `Application` component from `@pixi/react` may not support refs directly. Use `onMount` instead.

---

## 4. Existing Export Utilities in the Project

**Current Status**: No existing export utilities found in the project.

**Recommendation**: Create a new utility file `src/vision-board/export-utils.ts` with export functions.

---

## 5. Complete Implementation Example

### Step 1: Update VisionBoard Component

```typescript
// src/vision-board/index.tsx
import { useState, useEffect } from "react";
import { Application, extend, useApp } from "@pixi/react";
import { Container, Sprite, Graphics } from "pixi.js";
import type { Application as PIXIApplication } from "pixi.js";
// ... other imports

export function VisionBoard({
  config,
  selectedSlot,
  onSlotClick,
  onImageDrop,
}: VisionBoardProps) {
  const [scale, setScale] = useState(1);
  const [appInstance, setAppInstance] = useState<PIXIApplication | null>(null);

  // ... existing useEffect for scale

  return (
    <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
      {/* ... existing wrapper divs */}
      <Application
        width={POSTER_WIDTH}
        height={POSTER_HEIGHT}
        backgroundColor={0x020208}
        antialias
        preserveDrawingBuffer={true} // REQUIRED for export
        onMount={(app) => {
          setAppInstance(app);
        }}
      >
        <VisionBoardScene
          config={config}
          selectedSlot={selectedSlot}
          onSlotClick={onSlotClick}
        />
      </Application>
    </div>
  );
}
```

### Step 2: Create Export Utility

```typescript
// src/vision-board/export-utils.ts
import type { Application } from "pixi.js";

export interface ExportOptions {
  resolution?: number; // Multiplier for output resolution (default: 2)
  format?: 'png' | 'jpeg' | 'webp'; // Image format (default: 'png')
  quality?: number; // Compression quality 0-1 (default: 0.92, only for jpeg/webp)
  filename?: string; // Download filename (default: 'vision-board.png')
}

/**
 * Export Pixi.js canvas as a high-quality image blob
 */
export async function exportCanvasAsBlob(
  app: Application,
  options: ExportOptions = {}
): Promise<Blob> {
  const {
    resolution = 2,
    format = 'png',
    quality = 0.92,
  } = options;

  // Extract canvas at specified resolution
  const canvas = app.renderer.extract.canvas({
    resolution,
  });

  // Convert to blob
  return new Promise((resolve, reject) => {
    const mimeType = `image/${format}`;
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      mimeType,
      format === 'png' ? undefined : quality
    );
  });
}

/**
 * Export Pixi.js canvas and trigger download
 */
export async function exportAndDownloadCanvas(
  app: Application,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'vision-board.png' } = options;
  
  try {
    const blob = await exportCanvasAsBlob(app, options);
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export canvas:', error);
    throw error;
  }
}

/**
 * Export Pixi.js canvas as base64 data URL
 */
export function exportCanvasAsDataURL(
  app: Application,
  options: Omit<ExportOptions, 'filename'> = {}
): string {
  const {
    resolution = 2,
    format = 'png',
  } = options;

  return app.renderer.extract.base64({
    resolution,
    format,
  });
}
```

### Step 3: Use in Component

```typescript
// Example: Add export button to Sidebar or VisionBoard
import { exportAndDownloadCanvas } from './vision-board/export-utils';

function ExportButton({ app }: { app: PIXIApplication | null }) {
  const handleExport = async () => {
    if (!app) {
      console.error('Application not initialized');
      return;
    }
    
    try {
      await exportAndDownloadCanvas(app, {
        resolution: 2, // 2x = 3600×4800 pixels
        format: 'png',
        filename: 'vision-board.png',
      });
    } catch (error) {
      alert('Failed to export image. Please try again.');
    }
  };
  
  return (
    <button onClick={handleExport}>
      Export as PNG
    </button>
  );
}
```

---

## 6. Quality Considerations

### Resolution Multipliers
- **1x**: Native resolution (1800×2400) - Fast, smaller file
- **2x**: Double resolution (3600×4800) - Good balance of quality/size
- **3x**: Triple resolution (5400×7200) - Very high quality, large file
- **4x**: Quadruple resolution (7200×9600) - Maximum quality, very large file

### Format Recommendations
- **PNG**: Best for graphics with transparency, lossless, larger files
- **JPEG**: Best for photos, smaller files, no transparency
- **WebP**: Modern format, good compression, browser support varies

### Performance Notes
- Higher resolutions take longer to process
- Large exports may cause temporary UI freezing
- Consider showing a loading indicator for exports > 2x resolution

---

## 7. Browser Compatibility

- **toBlob()**: Supported in all modern browsers (IE11+)
- **ExtractSystem**: Available in Pixi.js v5+
- **preserveDrawingBuffer**: Required for WebGL exports

---

## Summary

**Recommended Approach:**
1. Add `preserveDrawingBuffer={true}` to Application component
2. Use `onMount` callback or `useApp()` hook to get app instance
3. Use `app.renderer.extract.canvas({ resolution: 2 })` for high-quality export
4. Convert to blob using native `canvas.toBlob()` with quality settings
5. Trigger download or create object URL for display

**Key Code Pattern:**
```typescript
const canvas = app.renderer.extract.canvas({ resolution: 2 });
canvas.toBlob((blob) => {
  // Handle blob (download, display, etc.)
}, 'image/png');
```
