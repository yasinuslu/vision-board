import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Application, extend, useApplication } from "@pixi/react";
import { Container, Sprite, Graphics, Application as PixiApplication } from "pixi.js";
import type { Config } from "../types";
import { POSTER_WIDTH, POSTER_HEIGHT } from "./constants";
import { VisionBoardScene } from "./VisionBoardScene";
import { exportCanvasAsImage } from "./utils/canvas-export";

// Register PixiJS components for JSX usage
extend({ Container, Sprite, Graphics });

export interface VisionBoardProps {
  config: Config;
  selectedSlot: string | null;
  onSlotClick: (slotId: string) => void;
  onImageDrop: (slotId: string, filename: string) => void;
}

export interface VisionBoardHandle {
  download: () => Promise<void>;
}

// Helper component to capture app instance
function AppCapture({ onApp }: { onApp: (app: PixiApplication) => void }) {
  const { app, isInitialised } = useApplication();
  useEffect(() => {
    if (isInitialised && app) {
      onApp(app);
    }
  }, [app, isInitialised, onApp]);
  return null;
}

// Main VisionBoard component
export const VisionBoard = forwardRef<VisionBoardHandle, VisionBoardProps>(
  function VisionBoard({ config, selectedSlot, onSlotClick, onImageDrop }, ref) {
    const [scale, setScale] = useState(1);
    const appRef = useRef<PixiApplication | null>(null);

    useEffect(() => {
      const updateScale = () => {
        const margin = 80;
        const availableWidth = window.innerWidth - 320;
        const availableHeight = window.innerHeight - margin;
        const scaleX = availableWidth / POSTER_WIDTH;
        const scaleY = availableHeight / POSTER_HEIGHT;
        setScale(Math.min(scaleX, scaleY, 1));
      };

      updateScale();
      window.addEventListener("resize", updateScale);
      return () => window.removeEventListener("resize", updateScale);
    }, []);

    // Expose download method to parent via ref
    useImperativeHandle(ref, () => ({
      download: async () => {
        if (appRef.current) {
          await exportCanvasAsImage(appRef.current);
        } else {
          console.error('App reference is null - canvas not initialized');
        }
      },
    }));

    return (
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <div
            style={{
              width: POSTER_WIDTH,
              height: POSTER_HEIGHT,
              border: "20px solid #1a1a2e",
              boxShadow: "inset 0 0 0 2px #3a3a5e, 0 0 60px rgba(0,0,0,0.8)",
              boxSizing: "content-box",
              overflow: "hidden",
            }}
          >
            <Application
              width={POSTER_WIDTH}
              height={POSTER_HEIGHT}
              backgroundColor={0x020208}
              antialias
            >
              <AppCapture onApp={(app) => { appRef.current = app; }} />
              <VisionBoardScene
                config={config}
                selectedSlot={selectedSlot}
                onSlotClick={onSlotClick}
              />
            </Application>
          </div>
        </div>
      </div>
    );
  }
);

// Re-export constants and types for convenience
export * from "./constants";
