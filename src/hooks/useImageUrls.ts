import { useEffect, useState, useRef } from "react";
import { loadImage as loadImageFromDB } from "../lib/browserStorage";

// Hook to convert image IDs to blob URLs (loads in parallel for speed)
export function useImageUrls(imageIds: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const loadedRef = useRef<Set<string>>(new Set());
  const urlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);

  useEffect(() => {
    const idsToLoad = imageIds.filter((id) => !loadedRef.current.has(id));
    if (idsToLoad.length === 0) {
      // Just prune URLs no longer in list
      setUrls((prev) => {
        const next: Record<string, string> = {};
        let changed = false;
        for (const id of imageIds) {
          if (prev[id]) next[id] = prev[id];
        }
        for (const id of Object.keys(prev)) {
          if (!imageIds.includes(id)) {
            const url = prev[id];
            if (url) URL.revokeObjectURL(url);
            loadedRef.current.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      return;
    }

    let cancelled = false;

    const loadUrls = async () => {
      // Load all blobs in parallel
      const results = await Promise.all(
        idsToLoad.map(async (id) => {
          try {
            const blob = await loadImageFromDB(id);
          return blob ? { id, url: URL.createObjectURL(blob) } : null;
          } catch (error) {
            console.error("Failed to load image:", id, error);
            return null;
          }
        })
      );

      if (cancelled) {
        results.forEach((r) => r?.url && URL.revokeObjectURL(r.url));
        return;
      }

      setUrls((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r) {
            next[r.id] = r.url;
            loadedRef.current.add(r.id);
          }
        });
        return next;
      });
    };

    loadUrls();

    return () => {
      cancelled = true;
    };
  }, [imageIds]);

  return urls;
}
