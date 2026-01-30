import { useState, useEffect, useCallback, useRef } from "react";
import { VisionBoard } from "./VisionBoard";
import type { VisionBoardHandle } from "./vision-board";
import { Sidebar } from "./Sidebar";
import type { SlotConfig, Config, EffectPreset } from "./types";
import {
  DEFAULT_SLOT_CONFIG,
  resetEffects,
  getEffectsOnly,
  TOTAL_DREAM_POSITIONS,
  createSlotConfig,
  applyPreset,
} from "./types";
import { useDebounce } from "./hooks/useDebounce";
import {
  saveConfig as saveConfigToStorage,
  loadConfig as loadConfigFromStorage,
  listImages,
  deleteImage as deleteImageFromStorage,
  saveImage as saveImageToStorage,
} from "./lib/browserStorage";
import { MediaLibraryModal } from "./MediaLibraryModal";
import "./index.css";

// Type for copied effects (effects without image and positionIndex)
type CopiedEffects = Omit<SlotConfig, "image" | "positionIndex"> | null;

export function App() {
  const [images, setImages] = useState<string[]>([]);
  const [config, setConfig] = useState<Config>({
    core: { ...DEFAULT_SLOT_CONFIG },
    dreams: [], // Dynamic array - can be empty
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedEffects, setCopiedEffects] = useState<CopiedEffects>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const visionBoardRef = useRef<VisionBoardHandle>(null);

  // Get available positions (not yet used by any slot)
  const getAvailablePositions = useCallback((): number[] => {
    const usedPositions = new Set(config.dreams.map((d) => d.positionIndex));
    return Array.from({ length: TOTAL_DREAM_POSITIONS }, (_, i) => i).filter(
      (i) => !usedPositions.has(i),
    );
  }, [config.dreams]);

  // Get slot by position index
  const getSlotByPosition = useCallback(
    (positionIndex: number): SlotConfig | undefined => {
      return config.dreams.find((d) => d.positionIndex === positionIndex);
    },
    [config.dreams],
  );

  // Download handler - exports canvas as image with progress
  const handleDownloadRequest = useCallback(async () => {
    // Show progress UI immediately
    setIsExporting(true);
    setExportProgress(0);
    
    // Wait for UI to render before starting heavy work
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Animate progress (fake progress since we can't get real progress from canvas.toBlob)
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        // Slow down as we approach 90% (leave room for actual completion)
        if (prev < 30) return prev + 8;
        if (prev < 60) return prev + 4;
        if (prev < 85) return prev + 2;
        return prev + 0.5;
      });
    }, 100);
    
    try {
      await visionBoardRef.current?.download();
      // Jump to 100% on success
      setExportProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause to show 100%
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      clearInterval(progressInterval);
      setIsExporting(false);
      setExportProgress(0);
    }
  }, []);

  // Debounced save function (300ms delay) - saves to localStorage
  const saveConfigToServer = useCallback((configToSave: Config) => {
    try {
      saveConfigToStorage(configToSave);
    } catch (error) {
      console.error("Failed to save config:", error);
    }
  }, []);

  const debouncedSave = useDebounce(saveConfigToServer, 300);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedSlot(null);
      }

      // Ctrl/Cmd + C to copy effects
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedSlot) {
        const slotConfig = getSlotConfigById(selectedSlot);
        if (slotConfig) {
          const { image, positionIndex, ...effects } = slotConfig;
          setCopiedEffects(effects);
        }
      }

      // Ctrl/Cmd + V to paste effects
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "v" &&
        selectedSlot &&
        copiedEffects
      ) {
        handlePasteEffects(selectedSlot);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSlot, copiedEffects, config]);

  // Get slot config by ID (core or dream-{positionIndex})
  const getSlotConfigById = useCallback(
    (slotId: string): SlotConfig | null => {
      if (slotId === "core") {
        return config.core;
      } else if (slotId.startsWith("dream-")) {
        const positionIndex = parseInt(slotId.split("-")[1] || "0", 10);
        return getSlotByPosition(positionIndex) || null;
      }
      return null;
    },
    [config, getSlotByPosition],
  );

  // Get dream array index from position index
  const getDreamIndexByPosition = useCallback(
    (positionIndex: number): number => {
      return config.dreams.findIndex((d) => d.positionIndex === positionIndex);
    },
    [config.dreams],
  );

  // Load images and config on mount from browser storage
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load images from IndexedDB
        const imageIds = await listImages();
        setImages(imageIds || []);

        // Load config from localStorage
        const savedConfig = loadConfigFromStorage<Config>();
        if (savedConfig) {
          // Ensure all slots have all properties
          const migratedConfig = migrateConfigWithDefaults(savedConfig);
          setConfig(migratedConfig);
        } else {
          // Ensure initial config has all properties
          const migratedConfig = migrateConfigWithDefaults(config);
          setConfig(migratedConfig);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Migrate config to ensure all fields exist
  const migrateConfigWithDefaults = (data: any): Config => {
    const migrateSlot = (
      slot: any,
      defaultPosition: number = 0,
    ): SlotConfig => ({
      ...DEFAULT_SLOT_CONFIG,
      ...slot,
      positionIndex: slot.positionIndex ?? defaultPosition,
    });

    return {
      core: migrateSlot(data.core || {}, -1),
      dreams: (data.dreams || []).map((d: any, i: number) =>
        migrateSlot(d || {}, d?.positionIndex ?? i),
      ),
    };
  };

  // Handle image upload
  const handleImageUpload = async (files: FileList) => {
    const uploadedIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        try {
          const id = await saveImageToStorage(file);
          uploadedIds.push(id);
        } catch (error) {
          console.error("Failed to upload image:", file.name, error);
        }
      }
    }

    if (uploadedIds.length > 0) {
      // Refresh images list
      const imageIds = await listImages();
      setImages(imageIds || []);
    }
  };

  // Handle image delete
  const handleImageDelete = async (imageId: string) => {
    try {
      await deleteImageFromStorage(imageId);

      setImages(images.filter((img) => img !== imageId));

      const newConfig = { ...config, dreams: [...config.dreams] };
      if (newConfig.core.image === imageId) {
        newConfig.core = { ...newConfig.core, image: null };
      }
      newConfig.dreams = newConfig.dreams.map((dream) =>
        dream.image === imageId ? { ...dream, image: null } : dream,
      );
      setConfig(newConfig);
      debouncedSave(newConfig);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // Handle slot click (on canvas)
  const handleSlotClick = (slotId: string) => {
    setSelectedSlot(selectedSlot === slotId ? null : slotId);
  };

  // Handle adding a new dream slot
  const handleAddSlot = (positionIndex: number) => {
    const usedPositions = new Set(config.dreams.map((d) => d.positionIndex));

    if (usedPositions.has(positionIndex)) {
      console.error("Position already in use:", positionIndex);
      return;
    }

    const newSlot: SlotConfig = {
      ...DEFAULT_SLOT_CONFIG,
      positionIndex,
    };

    const newConfig = {
      ...config,
      dreams: [...config.dreams, newSlot].sort(
        (a, b) => a.positionIndex - b.positionIndex,
      ),
    };

    setConfig(newConfig);
    debouncedSave(newConfig);
    setSelectedSlot(`dream-${positionIndex}`);
  };

  // Handle removing a dream slot
  const handleRemoveSlot = (positionIndex: number) => {
    const slotIndex = config.dreams.findIndex(
      (d) => d.positionIndex === positionIndex,
    );

    if (slotIndex === -1) {
      console.error("Slot not found:", positionIndex);
      return;
    }

    const newConfig = {
      ...config,
      dreams: config.dreams.filter((d) => d.positionIndex !== positionIndex),
    };

    setConfig(newConfig);
    debouncedSave(newConfig);

    // Deselect if the removed slot was selected
    if (selectedSlot === `dream-${positionIndex}`) {
      setSelectedSlot(null);
    }
  };

  // Helper to update a dream slot by position index
  const updateDreamByPosition = (
    dreams: SlotConfig[],
    positionIndex: number,
    updater: (dream: SlotConfig) => SlotConfig,
  ): SlotConfig[] => {
    return dreams.map((dream) =>
      dream.positionIndex === positionIndex ? updater(dream) : dream,
    );
  };

  // Handle clearing a slot's image
  const handleClearSlot = async (slotId: string) => {
    let newConfig: Config;

    if (slotId === "core") {
      newConfig = { ...config, core: { ...config.core, image: null } };
    } else if (slotId.startsWith("dream-")) {
      const positionIndex = parseInt(slotId.split("-")[1] || "0", 10);
      newConfig = {
        ...config,
        dreams: updateDreamByPosition(config.dreams, positionIndex, (d) => ({
          ...d,
          image: null,
        })),
      };
    } else {
      return;
    }

    setConfig(newConfig);
    debouncedSave(newConfig);
  };

  // Handle resetting all effects for a slot
  const handleResetEffects = async (slotId: string) => {
    let newConfig: Config;

    if (slotId === "core") {
      newConfig = { ...config, core: resetEffects(config.core) };
    } else if (slotId.startsWith("dream-")) {
      const positionIndex = parseInt(slotId.split("-")[1] || "0", 10);
      newConfig = {
        ...config,
        dreams: updateDreamByPosition(config.dreams, positionIndex, (d) =>
          resetEffects(d),
        ),
      };
    } else {
      return;
    }

    setConfig(newConfig);
    debouncedSave(newConfig);
  };

  // Handle copying effects
  const handleCopyEffects = (slotId: string) => {
    const slotConfig = getSlotConfigById(slotId);
    if (slotConfig) {
      const { image, positionIndex, ...effects } = slotConfig;
      setCopiedEffects(effects);
    }
  };

  // Handle pasting effects
  const handlePasteEffects = (slotId: string) => {
    if (!copiedEffects) return;

    let newConfig: Config;

    if (slotId === "core") {
      newConfig = { ...config, core: { ...config.core, ...copiedEffects } };
    } else if (slotId.startsWith("dream-")) {
      const positionIndex = parseInt(slotId.split("-")[1] || "0", 10);
      newConfig = {
        ...config,
        dreams: updateDreamByPosition(config.dreams, positionIndex, (d) => ({
          ...d,
          ...copiedEffects,
        })),
      };
    } else {
      return;
    }

    setConfig(newConfig);
    debouncedSave(newConfig);
  };

  // Handle applying preset effects (resets to defaults first, then applies preset)
  const handleApplyPreset = (slotId: string, preset: EffectPreset) => {
    let newConfig: Config;

    if (slotId === "core") {
      newConfig = { ...config, core: applyPreset(config.core, preset) };
    } else if (slotId.startsWith("dream-")) {
      const positionIndex = parseInt(slotId.split("-")[1] || "0", 10);
      newConfig = {
        ...config,
        dreams: updateDreamByPosition(config.dreams, positionIndex, (d) =>
          applyPreset(d, preset),
        ),
      };
    } else {
      return;
    }

    setConfig(newConfig);
    debouncedSave(newConfig);
  };

  // Handle image selection for slot
  const handleImageSelect = async (filename: string) => {
    if (!selectedSlot) return;

    let newConfig: Config;

    if (selectedSlot === "core") {
      newConfig = { ...config, core: { ...config.core, image: filename } };
    } else if (selectedSlot.startsWith("dream-")) {
      const positionIndex = parseInt(selectedSlot.split("-")[1] || "0", 10);
      newConfig = {
        ...config,
        dreams: updateDreamByPosition(config.dreams, positionIndex, (d) => ({
          ...d,
          image: filename,
        })),
      };
    } else {
      return;
    }

    setConfig(newConfig);
    debouncedSave(newConfig);
  };

  // Handle image drop on slot
  const handleImageDrop = async (slotId: string, filename: string) => {
    let newConfig: Config;

    if (slotId === "core") {
      newConfig = { ...config, core: { ...config.core, image: filename } };
    } else if (slotId.startsWith("dream-")) {
      const positionIndex = parseInt(slotId.split("-")[1] || "0", 10);
      newConfig = {
        ...config,
        dreams: updateDreamByPosition(config.dreams, positionIndex, (d) => ({
          ...d,
          image: filename,
        })),
      };
    } else {
      return;
    }

    setConfig(newConfig);
    debouncedSave(newConfig);
    setSelectedSlot(slotId);
  };

  // Handle slot property change (generic handler)
  const handleSlotPropertyChange = useCallback(
    (
      slotId: string,
      property: keyof SlotConfig,
      value: number | string | null,
    ) => {
      setConfig((prevConfig) => {
        if (slotId === "core") {
          return {
            ...prevConfig,
            core: { ...prevConfig.core, [property]: value },
          };
        } else if (slotId.startsWith("dream-")) {
          const positionIndex = parseInt(slotId.split("-")[1] || "0", 10);
          return {
            ...prevConfig,
            dreams: prevConfig.dreams.map((d) =>
              d.positionIndex === positionIndex
                ? { ...d, [property]: value }
                : d,
            ),
          };
        }
        return prevConfig;
      });

      // Debounced save (note: this will use stale config, but debounce will get latest)
      setConfig((current) => {
        debouncedSave(current);
        return current;
      });
    },
    [debouncedSave],
  );

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">
            Loading Vision Board...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="app flex h-screen bg-black overflow-hidden">
      <Sidebar
        images={images}
        selectedSlot={selectedSlot}
        config={config}
        copiedEffects={copiedEffects}
        availablePositions={getAvailablePositions()}
        onImageSelect={handleImageSelect}
        onImageDelete={handleImageDelete}
        onImageUpload={handleImageUpload}
        onSlotPropertyChange={handleSlotPropertyChange}
        onClearSlot={handleClearSlot}
        onResetEffects={handleResetEffects}
        onCopyEffects={handleCopyEffects}
        onPasteEffects={handlePasteEffects}
        onApplyPreset={handleApplyPreset}
        onAddSlot={handleAddSlot}
        onRemoveSlot={handleRemoveSlot}
        onSlotClick={(slotId: string) => setSelectedSlot(slotId || null)}
        onPrintRequest={handleDownloadRequest}
        onOpenMediaLibrary={() => setMediaLibraryOpen(true)}
      />
      <VisionBoard
        ref={visionBoardRef}
        config={config}
        selectedSlot={selectedSlot}
        onSlotClick={handleSlotClick}
        onImageDrop={handleImageDrop}
      />
      
      {/* Media Library Modal */}
      <MediaLibraryModal
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
        images={images}
        config={config}
        onDelete={handleImageDelete}
      />

      {/* Export Progress Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-80 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Exporting Vision Board
                </h3>
                <p className="text-sm text-muted-foreground">
                  Creating high-resolution image...
                </p>
              </div>
              <div className="w-full">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-100 ease-out rounded-full"
                    style={{ width: `${Math.min(exportProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {Math.round(exportProgress)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
