import React, { useState, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Copy,
  ClipboardPaste,
  Sparkles,
  Move,
  Sun,
  Palette,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlotConfig, Config, EffectPreset } from "./types";
import { DEFAULT_SLOT_CONFIG, hasCustomEffects, EFFECT_PRESETS } from "./types";
import { useImageUrls } from "./hooks/useImageUrls";

interface SidebarProps {
  images: string[];
  selectedSlot: string | null;
  config: Config;
  copiedEffects: Omit<SlotConfig, "image" | "positionIndex"> | null;
  availablePositions: number[];
  onImageSelect: (filename: string) => void;
  onImageDelete: (filename: string) => void;
  onImageUpload: (files: FileList) => Promise<void>;
  onSlotPropertyChange: (
    slotId: string,
    property: keyof SlotConfig,
    value: number | string | null,
  ) => void;
  onClearSlot: (slotId: string) => void;
  onResetEffects: (slotId: string) => void;
  onCopyEffects: (slotId: string) => void;
  onPasteEffects: (slotId: string) => void;
  onApplyPreset: (slotId: string, preset: EffectPreset) => void;
  onAddSlot: (positionIndex: number) => void;
  onRemoveSlot: (positionIndex: number) => void;
  onSlotClick: (slotId: string) => void;
}

// Position names for better UX
const POSITION_NAMES = [
  "Top Left",
  "Top Center",
  "Top Right",
  "Upper Left",
  "Upper Right",
  "Middle Left",
  "Middle Right",
  "Lower Left",
  "Lower Right",
  "Bottom Left",
  "Bottom Center",
  "Bottom Right",
  "Inner Left",
  "Inner Right",
];

// Slider configurations with tooltips
const SLIDER_CONFIGS = {
  size: {
    min: 0.5,
    max: 2.0,
    step: 0.05,
    label: "Size",
    tooltip: "Scale the entire slot",
    format: (v: number) => `${Math.round(v * 100)}%`,
    icon: null,
  },
  zoom: {
    min: 0.5,
    max: 3.0,
    step: 0.05,
    label: "Zoom",
    tooltip: "Zoom into the image (crop)",
    format: (v: number) => `${Math.round(v * 100)}%`,
    icon: null,
  },
  opacity: {
    min: 0,
    max: 1,
    step: 0.05,
    label: "Opacity",
    tooltip: "Transparency level",
    format: (v: number) => `${Math.round(v * 100)}%`,
    icon: null,
  },
  blur: {
    min: 0,
    max: 20,
    step: 1,
    label: "Blur",
    tooltip: "Gaussian blur effect",
    format: (v: number) => `${v}px`,
    icon: null,
  },
  glowIntensity: {
    min: 0,
    max: 2,
    step: 0.05,
    label: "Glow",
    tooltip: "Ethereal glow around image",
    format: (v: number) => `${Math.round(v * 100)}%`,
    icon: Sparkles,
  },
  offsetX: {
    min: -200,
    max: 200,
    step: 5,
    label: "X Offset",
    tooltip: "Horizontal position adjustment",
    format: (v: number) => `${v}px`,
    icon: Move,
  },
  offsetY: {
    min: -200,
    max: 200,
    step: 5,
    label: "Y Offset",
    tooltip: "Vertical position adjustment",
    format: (v: number) => `${v}px`,
    icon: Move,
  },
  rotation: {
    min: -180,
    max: 180,
    step: 5,
    label: "Rotation",
    tooltip: "Rotate the image",
    format: (v: number) => `${v}°`,
    icon: null,
  },
  saturation: {
    min: 0,
    max: 2,
    step: 0.05,
    label: "Saturation",
    tooltip: "Color intensity",
    format: (v: number) => `${Math.round(v * 100)}%`,
    icon: Palette,
  },
  brightness: {
    min: 0,
    max: 2,
    step: 0.05,
    label: "Brightness",
    tooltip: "Light intensity",
    format: (v: number) => `${Math.round(v * 100)}%`,
    icon: Sun,
  },
  contrast: {
    min: 0,
    max: 2,
    step: 0.05,
    label: "Contrast",
    tooltip: "Difference between darks and lights",
    format: (v: number) => `${Math.round(v * 100)}%`,
    icon: null,
  },
};

// Get slot config by ID (uses positionIndex for dreams)
const getSlotConfig = (slotId: string, config: Config): SlotConfig | null => {
  if (slotId === "core") {
    return config.core;
  } else if (slotId.startsWith("dream-")) {
    const positionIndex = parseInt(slotId.split("-")[1] || "0", 10);
    return config.dreams.find((d) => d.positionIndex === positionIndex) || null;
  }
  return null;
};

// Compact Effect Slider Component
const EffectSlider = memo(function EffectSlider({
  slotId,
  property,
  value,
  onChange,
}: {
  slotId: string;
  property: keyof typeof SLIDER_CONFIGS;
  value: number;
  onChange: (slotId: string, property: keyof SlotConfig, value: number) => void;
}) {
  const config = SLIDER_CONFIGS[property];
  const defaultValue = DEFAULT_SLOT_CONFIG[
    property as keyof SlotConfig
  ] as number;
  const isDefault = Math.abs(value - defaultValue) < 0.001;

  return (
    <div className="space-y-1.5" title={config.tooltip}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground truncate">
          {config.label}
        </span>
        <div className="flex items-center gap-0.5">
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              !isDefault && "text-primary",
            )}
          >
            {config.format(value)}
          </span>
          {!isDefault && (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                onChange(slotId, property as keyof SlotConfig, defaultValue);
              }}
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        min={config.min}
        max={config.max}
        step={config.step}
        onValueChange={(values) =>
          onChange(
            slotId,
            property as keyof SlotConfig,
            values[0] || defaultValue,
          )
        }
        className="w-full"
      />
    </div>
  );
});

// Image Picker Component
const ImagePicker = memo(function ImagePicker({
  images,
  selectedImage,
  imageUrls,
  onSelect,
}: {
  images: string[];
  selectedImage: string | null;
  imageUrls: Record<string, string>;
  onSelect: (filename: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayImages = showAll ? images : images.slice(0, 6);

  if (images.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-3 bg-muted/30 rounded-lg">
        <ImageIcon className="h-5 w-5 mx-auto mb-1 opacity-50" />
        <p className="text-[11px]">No images uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-6 gap-1">
        {displayImages.map((filename) => (
          <div
            key={filename}
            className={cn(
              "aspect-square rounded cursor-pointer transition-all border-2 overflow-hidden",
              selectedImage === filename
                ? "border-primary ring-1 ring-primary scale-105"
                : "border-transparent hover:border-muted-foreground/50",
            )}
            onClick={() => onSelect(filename)}
          >
            <img
              src={imageUrls[filename] || ""}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      {images.length > 6 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-6 text-[11px]"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />+{images.length - 6} more
            </>
          )}
        </Button>
      )}
    </div>
  );
});

// Effects Section Component
function EffectsSection({
  slotId,
  slotConfig,
  onSlotPropertyChange,
}: {
  slotId: string;
  slotConfig: SlotConfig;
  onSlotPropertyChange: (
    slotId: string,
    property: keyof SlotConfig,
    value: number,
  ) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Transform Group */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          <Move className="h-3 w-3" />
          Transform
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <EffectSlider
            slotId={slotId}
            property="size"
            value={slotConfig.size}
            onChange={onSlotPropertyChange}
          />
          <EffectSlider
            slotId={slotId}
            property="zoom"
            value={slotConfig.zoom ?? 1}
            onChange={onSlotPropertyChange}
          />
          <EffectSlider
            slotId={slotId}
            property="rotation"
            value={slotConfig.rotation}
            onChange={onSlotPropertyChange}
          />
          <EffectSlider
            slotId={slotId}
            property="offsetX"
            value={slotConfig.offsetX}
            onChange={onSlotPropertyChange}
          />
          <EffectSlider
            slotId={slotId}
            property="offsetY"
            value={slotConfig.offsetY}
            onChange={onSlotPropertyChange}
          />
        </div>
      </div>

      {/* Appearance Group */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          <Sun className="h-3 w-3" />
          Appearance
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <EffectSlider
            slotId={slotId}
            property="opacity"
            value={slotConfig.opacity}
            onChange={onSlotPropertyChange}
          />
          <EffectSlider
            slotId={slotId}
            property="brightness"
            value={slotConfig.brightness}
            onChange={onSlotPropertyChange}
          />
          <EffectSlider
            slotId={slotId}
            property="contrast"
            value={slotConfig.contrast}
            onChange={onSlotPropertyChange}
          />
          <EffectSlider
            slotId={slotId}
            property="saturation"
            value={slotConfig.saturation}
            onChange={onSlotPropertyChange}
          />
        </div>
      </div>

      {/* Effects Group */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          <Sparkles className="h-3 w-3" />
          Effects
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <EffectSlider
            slotId={slotId}
            property="blur"
            value={slotConfig.blur}
            onChange={onSlotPropertyChange}
          />
          <EffectSlider
            slotId={slotId}
            property="glowIntensity"
            value={slotConfig.glowIntensity}
            onChange={onSlotPropertyChange}
          />
        </div>
      </div>
    </div>
  );
}

// Preset Button Component
function PresetButton({
  preset,
  onApply,
}: {
  preset: EffectPreset;
  onApply: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-[10px] px-2"
      onClick={onApply}
      title={preset.description}
    >
      {preset.name}
    </Button>
  );
}

// Slot Panel Component
function SlotPanel({
  slotId,
  slotConfig,
  images,
  imageUrls,
  isCore,
  copiedEffects,
  onImageSelect,
  onSlotPropertyChange,
  onClearSlot,
  onResetEffects,
  onCopyEffects,
  onPasteEffects,
  onApplyPreset,
  onRemoveSlot,
}: {
  slotId: string;
  slotConfig: SlotConfig;
  images: string[];
  imageUrls: Record<string, string>;
  isCore: boolean;
  copiedEffects: Omit<SlotConfig, "image" | "positionIndex"> | null;
  onImageSelect: (filename: string) => void;
  onSlotPropertyChange: (
    slotId: string,
    property: keyof SlotConfig,
    value: number | string | null,
  ) => void;
  onClearSlot: (slotId: string) => void;
  onResetEffects: (slotId: string) => void;
  onCopyEffects: (slotId: string) => void;
  onPasteEffects: (slotId: string) => void;
  onApplyPreset: (slotId: string, preset: EffectPreset) => void;
  onRemoveSlot?: (positionIndex: number) => void;
}) {
  const hasEffects = hasCustomEffects(slotConfig);
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {slotConfig.image && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onClearSlot(slotId)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
        {hasEffects && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => onResetEffects(slotId)}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
        <Button
          variant={showPresets ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => setShowPresets(!showPresets)}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Presets
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onCopyEffects(slotId)}
          title="Copy effects (Ctrl+C)"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", !copiedEffects && "opacity-50")}
          onClick={() => onPasteEffects(slotId)}
          disabled={!copiedEffects}
          title="Paste effects (Ctrl+V)"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Presets Panel */}
      {showPresets && (
        <div className="bg-muted/30 rounded-lg p-2 space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Quick Presets
          </span>
          <div className="flex flex-wrap gap-1">
            {EFFECT_PRESETS.map((preset) => (
              <PresetButton
                key={preset.name}
                preset={preset}
                onApply={() => {
                  onApplyPreset(slotId, preset);
                  setShowPresets(false);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Remove Slot Button (only for dreams) */}
      {!isCore && onRemoveSlot && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRemoveSlot(slotConfig.positionIndex)}
        >
          <X className="h-3 w-3 mr-1" />
          Remove This Slot
        </Button>
      )}

      {/* Image Selection */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          Select Image
        </span>
        <ImagePicker
          images={images}
          selectedImage={slotConfig.image}
          imageUrls={imageUrls}
          onSelect={onImageSelect}
        />
      </div>

      <Separator className="my-2" />

      {/* Effects */}
      <EffectsSection
        slotId={slotId}
        slotConfig={slotConfig}
        onSlotPropertyChange={onSlotPropertyChange}
      />
    </div>
  );
}

// Slot Thumbnail Component
const SlotThumbnail = memo(function SlotThumbnail({
  slotConfig,
  imageUrls,
  isCore,
}: {
  slotConfig: SlotConfig;
  imageUrls: Record<string, string>;
  isCore?: boolean;
}) {
  return (
    <div
      className={cn(
        "h-9 w-9 rounded overflow-hidden shrink-0 transition-transform",
        isCore ? "ring-2 ring-primary/50" : "ring-1 ring-border",
      )}
    >
      {slotConfig.image ? (
        <img
          src={imageUrls[slotConfig.image] || ""}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            isCore ? "bg-primary/10" : "bg-muted/50",
          )}
        >
          <ImageIcon
            className={cn(
              "h-3.5 w-3.5",
              isCore ? "text-primary/50" : "text-muted-foreground/40",
            )}
          />
        </div>
      )}
    </div>
  );
});

export function Sidebar({
  images,
  selectedSlot,
  config,
  copiedEffects,
  availablePositions,
  onImageSelect,
  onImageDelete,
  onImageUpload,
  onSlotPropertyChange,
  onClearSlot,
  onResetEffects,
  onCopyEffects,
  onPasteEffects,
  onApplyPreset,
  onAddSlot,
  onRemoveSlot,
  onSlotClick,
}: SidebarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadExpanded, setUploadExpanded] = useState(true);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image URLs from IndexedDB
  const imageUrls = useImageUrls(images);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploading(true);
      try {
        await onImageUpload(files);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploading(true);
      try {
        await onImageUpload(files);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // Build list of slots - Core + active dream slots
  const dreamSlots = config.dreams
    .slice() // Create copy to avoid mutating
    .sort((a, b) => a.positionIndex - b.positionIndex)
    .map((dream) => ({
      id: `dream-${dream.positionIndex}`,
      name:
        POSITION_NAMES[dream.positionIndex] ||
        `Position ${dream.positionIndex + 1}`,
      positionIndex: dream.positionIndex,
      isCore: false,
    }));

  const allSlots = [
    { id: "core", name: "Core", positionIndex: -1, isCore: true },
    ...dreamSlots,
  ];

  return (
    <div className="w-80 h-screen bg-card border-r border-border flex flex-col overflow-hidden">
      {/* Upload Zone - Collapsible */}
      <div className="border-b border-border">
        <div
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setUploadExpanded(!uploadExpanded)}
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Images</span>
            {images.length > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px]">
                {images.length}
              </Badge>
            )}
          </div>
          {uploadExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {uploadExpanded && (
          <div className="px-3 pb-3">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-3 transition-all cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
                uploading && "opacity-50 cursor-wait",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="text-center">
                <Upload
                  className={cn(
                    "h-6 w-6 mx-auto mb-1.5 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <p className="text-[11px] text-muted-foreground">
                  {uploading
                    ? "Uploading..."
                    : "Drop images or click to browse"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="px-3 py-1.5 bg-muted/30 border-b border-border text-[10px] text-muted-foreground flex items-center justify-center gap-3">
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Esc</kbd>{" "}
          deselect
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">⌘C</kbd> copy
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">⌘V</kbd>{" "}
          paste
        </span>
      </div>

      {/* Slots Accordion */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          {/* Add Slot Button */}
          {availablePositions.length > 0 && (
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-sm border-dashed"
                onClick={() => setShowAddSlot(!showAddSlot)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Dream Slot
                <Badge variant="secondary" className="ml-2 h-5 text-[10px]">
                  {availablePositions.length} available
                </Badge>
              </Button>

              {/* Position Picker */}
              {showAddSlot && (
                <div className="bg-muted/30 rounded-lg p-2 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Select Position
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {availablePositions.map((posIndex) => (
                      <Button
                        key={posIndex}
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] px-1"
                        onClick={() => {
                          onAddSlot(posIndex);
                          setShowAddSlot(false);
                        }}
                      >
                        {POSITION_NAMES[posIndex] || `Pos ${posIndex + 1}`}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Accordion
            type="single"
            collapsible
            value={selectedSlot ?? ""}
            onValueChange={(value) => {
              // value is "" when collapsed, slot id when expanded
              onSlotClick(value);
            }}
            className="space-y-1"
          >
            {allSlots.map(({ id, name, isCore, positionIndex }) => {
              const slotConfig = getSlotConfig(id, config);
              if (!slotConfig) return null;

              const hasImage = !!slotConfig.image;
              const hasEffects = hasCustomEffects(slotConfig);

              return (
                <AccordionItem
                  key={id}
                  value={id}
                  className={cn(
                    "rounded-lg border px-2.5 transition-colors",
                    isCore
                      ? "border-primary/30 bg-primary/5"
                      : hasImage
                        ? "border-border bg-card"
                        : "border-border/50 bg-card/50",
                  )}
                >
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <SlotThumbnail
                        slotConfig={slotConfig}
                        imageUrls={imageUrls}
                        isCore={isCore}
                      />
                      <div className="flex flex-col items-start gap-0.5">
                        <span
                          className={cn(
                            "text-sm font-medium leading-none",
                            isCore && "text-primary",
                          )}
                        >
                          {name}
                        </span>
                        <div className="flex gap-1">
                          {hasImage && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] h-3.5 px-1 py-0 font-normal"
                            >
                              {slotConfig.image?.split("_").pop()?.slice(0, 12)}
                              ...
                            </Badge>
                          )}
                          {hasEffects && (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-3.5 px-1 py-0 font-normal border-primary/30 text-primary"
                            >
                              <Sparkles className="h-2 w-2 mr-0.5" />
                              fx
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-3">
                    <SlotPanel
                      slotId={id}
                      slotConfig={slotConfig}
                      images={images}
                      imageUrls={imageUrls}
                      isCore={isCore}
                      copiedEffects={copiedEffects}
                      onImageSelect={onImageSelect}
                      onSlotPropertyChange={onSlotPropertyChange}
                      onClearSlot={onClearSlot}
                      onResetEffects={onResetEffects}
                      onCopyEffects={onCopyEffects}
                      onPasteEffects={onPasteEffects}
                      onApplyPreset={onApplyPreset}
                      onRemoveSlot={isCore ? undefined : onRemoveSlot}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Empty State */}
          {config.dreams.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No dream slots yet</p>
              <p className="text-xs mt-1">
                Click "Add Dream Slot" to get started
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
