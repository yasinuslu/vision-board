import { useState, useEffect, useCallback, startTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getImageMetadata, type StoredImage } from "./lib/browserStorage";
import { useImageUrls } from "./hooks/useImageUrls";
import type { Config } from "./types";

interface MediaLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  config: Config;
  onDelete: (imageId: string) => void;
}

// Format bytes to human-readable size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format timestamp to readable date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Get which slots are using this image
function getImageUsage(
  imageId: string,
  config: Config
): { inUse: boolean; slots: string[] } {
  const slots: string[] = [];

  if (config.core.image === imageId) {
    slots.push("Core");
  }

  config.dreams.forEach((dream) => {
    if (dream.image === imageId) {
      slots.push(`Dream ${dream.positionIndex + 1}`);
    }
  });

  return { inUse: slots.length > 0, slots };
}

// Image card component
function ImageCard({
  imageId,
  metadata,
  imageUrl,
  usage,
  onDelete,
  isDeleting,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  imageId: string;
  metadata: StoredImage | null;
  imageUrl: string;
  usage: { inUse: boolean; slots: string[] };
  onDelete: () => void;
  isDeleting: boolean;
  confirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative bg-muted/30 rounded-lg border border-border overflow-hidden transition-all [content-visibility:auto] [contain-intrinsic-size:auto_120px]",
        confirmingDelete && "ring-2 ring-destructive",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-square relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={metadata?.originalName || imageId}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}

        {/* In Use Badge */}
        {usage.inUse && (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 text-[10px] bg-primary/90 text-primary-foreground"
          >
            In Use
          </Badge>
        )}

        {/* Delete confirmation overlay */}
        {confirmingDelete && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 p-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-xs text-center text-white">
              {usage.inUse
                ? `Used in: ${usage.slots.join(", ")}`
                : "Delete this image?"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={onConfirmDelete}
              >
                Delete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                onClick={onCancelDelete}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Delete button (shown on hover) */}
        {!confirmingDelete && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Metadata */}
      <div className="p-2 space-y-1">
        <p
          className="text-xs font-medium truncate"
          title={metadata?.originalName || imageId}
        >
          {metadata?.originalName || imageId.split("_").pop() || imageId}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {metadata && (
            <>
              <span>{formatFileSize(metadata.size)}</span>
              <span>•</span>
              <span>{formatDate(metadata.timestamp)}</span>
            </>
          )}
        </div>
        {usage.inUse && (
          <p className="text-[10px] text-primary truncate" title={usage.slots.join(", ")}>
            {usage.slots.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

export function MediaLibraryModal({
  open,
  onOpenChange,
  images,
  config,
  onDelete,
}: MediaLibraryModalProps) {
  const [metadata, setMetadata] = useState<Record<string, StoredImage | null>>(
    {}
  );
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // 1) contentReady = show grid (after dialog open animation). 2) loadImages = start loading blobs/metadata.
  const [contentReady, setContentReady] = useState(false);
  const [loadImages, setLoadImages] = useState(false);

  // Only pass images to useImageUrls after dialog is fully open and we've painted the grid
  const imagesToLoad = open && contentReady && loadImages ? images : [];
  const imageUrls = useImageUrls(imagesToLoad);

  // When dialog opens: wait for open animation (200ms), then show grid, then start loading images
  useEffect(() => {
    if (!open) {
      setContentReady(false);
      setLoadImages(false);
      return;
    }
    let rafId: number | null = null;
    const t = setTimeout(() => {
      startTransition(() => setContentReady(true));
      // Start loading images only after the grid has been painted (next frame)
      rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => setLoadImages(true));
      });
    }, 220);
    return () => {
      clearTimeout(t);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [open]);

  // Load metadata in parallel only after we've decided to load (after dialog is fully open)
  useEffect(() => {
    if (!open || !loadImages || images.length === 0) return;

    let cancelled = false;
    const loadMetadata = async () => {
      const results = await Promise.all(
        images.map((imageId) =>
          getImageMetadata(imageId).catch(() => null)
        )
      );
      if (cancelled) return;
      const newMetadata: Record<string, StoredImage | null> = {};
      images.forEach((id, i) => {
        newMetadata[id] = results[i];
      });
      setMetadata(newMetadata);
    };

    loadMetadata();
    return () => {
      cancelled = true;
    };
  }, [open, loadImages, images]);

  // Handle delete with confirmation
  const handleDeleteClick = useCallback((imageId: string) => {
    setConfirmingDelete(imageId);
  }, []);

  const handleConfirmDelete = useCallback(
    async (imageId: string) => {
      setDeletingId(imageId);
      setConfirmingDelete(null);
      try {
        await onDelete(imageId);
      } finally {
        setDeletingId(null);
      }
    },
    [onDelete]
  );

  const handleCancelDelete = useCallback(() => {
    setConfirmingDelete(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Media Library
            {images.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {images.length} {images.length === 1 ? "image" : "images"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage your uploaded images. Images in use are marked with a badge.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {!contentReady && images.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm">Loading library...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No images uploaded</p>
              <p className="text-sm mt-1">
                Upload images using the sidebar to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4 [content-visibility:auto]">
              {images.map((imageId) => {
                const usage = getImageUsage(imageId, config);
                return (
                  <ImageCard
                    key={imageId}
                    imageId={imageId}
                    metadata={metadata[imageId] || null}
                    imageUrl={imageUrls[imageId] || ""}
                    usage={usage}
                    onDelete={() => handleDeleteClick(imageId)}
                    isDeleting={deletingId === imageId}
                    confirmingDelete={confirmingDelete === imageId}
                    onConfirmDelete={() => handleConfirmDelete(imageId)}
                    onCancelDelete={handleCancelDelete}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
