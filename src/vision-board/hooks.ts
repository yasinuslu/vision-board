import { useEffect, useState, useCallback, useRef } from "react";
import { Texture } from "pixi.js";
import { createFadedTexture } from "./texture-utils";
import { loadImage as loadImageFromDB } from "../lib/browserStorage";

// Hook to load and cache faded textures with blob URLs
export function useFadedTexture(
  imageId: string | null,
  size: number,
  zoom: number = 1.0,
): Texture | undefined {
  const [texture, setTexture] = useState<Texture | undefined>(undefined);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!imageId || loadingRef.current) return;

    loadingRef.current = true;

    const loadTexture = async () => {
      try {
        // Load image from IndexedDB
        const blob = await loadImageFromDB(imageId);

        if (!blob) {
          console.warn("Image not found in IndexedDB:", imageId);
          loadingRef.current = false;
          return;
        }

        // Create object URL
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        // Create texture
        const tex = await createFadedTexture(url, size, zoom);
        setTexture(tex);
      } catch (error) {
        console.error("Failed to load texture:", error);
      } finally {
        loadingRef.current = false;
      }
    };

    loadTexture();

    // Cleanup
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      texture?.destroy(true);
      setTexture(undefined);
    };
  }, [imageId, size, zoom]);

  return texture;
}
