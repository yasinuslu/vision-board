import React, { useState, useRef } from "react";
import { useImageUrls } from "./hooks/useImageUrls";

interface ImageManagerProps {
  images: string[];
  selectedSlot: string | null;
  selectedSlotImage: string | null;
  onImageSelect: (filename: string) => void;
  onImageDelete: (filename: string) => void;
  onImageUpload: (files: FileList) => Promise<void>;
  onDragStart: (filename: string, e: React.DragEvent) => void;
  onClearSlot: (slotId: string) => void;
}

// Helper to format slot display name
const formatSlotName = (slotId: string): string => {
  if (slotId === "core") {
    return "Core (center)";
  } else if (slotId.startsWith("dream-")) {
    const index = parseInt(slotId.split("-")[1] || "0", 10);
    return `Dream slot ${index + 1}`;
  }
  return slotId;
};

export function ImageManager({
  images,
  selectedSlot,
  selectedSlotImage,
  onImageSelect,
  onImageDelete,
  onImageUpload,
  onDragStart,
  onClearSlot,
}: ImageManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="w-80 h-screen bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
      {/* Upload Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          m-4 p-8 border-2 border-dashed rounded-lg cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
          }
          ${uploading ? "opacity-50 cursor-wait" : ""}
        `}
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
          <svg
            className="mx-auto h-12 w-12 text-gray-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4h12m-4 4v12m-12 4h12.01M36 20v-4a4 4 0 00-4-4h-8"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-400">
            {uploading ? "Uploading..." : "Drop images here or click to browse"}
          </p>
        </div>
      </div>

      {/* Image Library */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedSlot && (
          <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500 rounded">
            <div className="text-sm text-blue-300 font-medium">
              Selected: {formatSlotName(selectedSlot)}
            </div>
            {selectedSlotImage && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={imageUrls[selectedSlotImage] || ""}
                  alt="Current"
                  className="w-10 h-10 object-cover rounded"
                />
                <span className="text-xs text-gray-400 flex-1 truncate">
                  {selectedSlotImage}
                </span>
                <button
                  onClick={() => onClearSlot(selectedSlot)}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
            {!selectedSlotImage && (
              <div className="mt-1 text-xs text-gray-500">
                Click an image below to assign it
              </div>
            )}
          </div>
        )}

        {images.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No images uploaded yet</p>
            <p className="text-sm mt-2">Upload images to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {images.map((filename) => (
              <div
                key={filename}
                className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-move hover:ring-2 hover:ring-blue-500 transition-all"
                draggable
                onDragStart={(e) => onDragStart(filename, e)}
                onClick={() => selectedSlot && onImageSelect(filename)}
              >
                <img
                  src={imageUrls[filename] || ""}
                  alt={filename}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageDelete(filename);
                    }}
                    className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-opacity"
                    title="Delete image"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                {selectedSlot && (
                  <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                    Click to assign
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
