// Browser storage utilities for Vision Board
// IndexedDB for images (blobs), localStorage for config

const DB_NAME = "visionboard-store";
const DB_VERSION = 1;
const IMAGES_STORE = "images";
const CONFIG_KEY = "visionboard-config";

// Image metadata stored in IndexedDB
export interface StoredImage {
  id: string;
  blob: Blob;
  timestamp: number;
  originalName: string;
  size: number;
  type: string;
}

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create images store if it doesn't exist
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const store = db.createObjectStore(IMAGES_STORE, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
};

// Save image to IndexedDB
export const saveImage = async (file: File): Promise<string> => {
  const db = await initDB();
  const id = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const imageData: StoredImage = {
    id,
    blob: file,
    timestamp: Date.now(),
    originalName: file.name,
    size: file.size,
    type: file.type,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.add(imageData);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
};

// Load image from IndexedDB as blob URL
export const loadImage = async (id: string): Promise<Blob | null> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as StoredImage | undefined;
      resolve(result ? result.blob : null);
    };
    request.onerror = () => reject(request.error);
  });
};

// List all image IDs
export const listImages = async (): Promise<string[]> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.getAllKeys();

    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
};

// Delete image from IndexedDB
export const deleteImage = async (id: string): Promise<void> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get image metadata
export const getImageMetadata = async (
  id: string,
): Promise<StoredImage | null> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as StoredImage | undefined;
      resolve(result || null);
    };
    request.onerror = () => reject(request.error);
  });
};

// Save config to localStorage
export const saveConfig = <T>(config: T): void => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save config to localStorage:", error);
  }
};

// Load config from localStorage
export const loadConfig = <T>(): T | null => {
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load config from localStorage:", error);
    return null;
  }
};

// Delete config from localStorage
export const deleteConfig = (): void => {
  localStorage.removeItem(CONFIG_KEY);
};
