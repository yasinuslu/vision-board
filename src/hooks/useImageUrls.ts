import { useEffect, useState, useRef } from "react";
import { loadImage as loadImageFromDB } from "../lib/browserStorage";

// Hook to convert image IDs to blob URLs
export function useImageUrls(imageIds: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadUrls = async () => {
      const newUrls: Record<string, string> = { ...urls };

      for (const id of imageIds) {
        if (loadedRef.current.has(id)) continue;

        try {
          const blob = await loadImageFromDB(id);
          if (blob) {
            newUrls[id] = URL.createObjectURL(blob);
            loadedRef.current.add(id);
          }
        } catch (error) {
          console.error("Failed to load image:", id, error);
        }
      }

      setUrls(newUrls);
    };

    loadUrls();

    // Cleanup
    return () => {
      // Revoke all URLs that are no longer in the list
      Object.keys(urls).forEach((id) => {
        if (!imageIds.includes(id)) {
          const url = urls[id as string];
          if (url) {
            URL.revokeObjectURL(url);
          }
          loadedRef.current.delete(id);
        }
      });
    };
  }, [imageIds]);

  return urls;
}
