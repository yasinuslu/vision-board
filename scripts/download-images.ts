import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const IMAGES_DIR = join(import.meta.dir, "../src/images");
const IMAGE_COUNT = 15;

async function downloadImages() {
  // Create images directory
  await mkdir(IMAGES_DIR, { recursive: true });
  console.log(`📁 Created directory: ${IMAGES_DIR}`);

  // Download images
  for (let i = 0; i < IMAGE_COUNT; i++) {
    const imageId = 100 + i * 10;
    const url = `https://picsum.photos/id/${imageId}/400/400`;
    const filename = `image-${i.toString().padStart(2, "0")}.jpg`;
    const filepath = join(IMAGES_DIR, filename);

    console.log(`⬇️  Downloading image ${i + 1}/${IMAGE_COUNT}: ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      await Bun.write(filepath, buffer);
      console.log(`✅ Saved: ${filename}`);
    } catch (err) {
      console.error(`❌ Failed to download image ${i}: ${err}`);
    }
  }

  console.log("\n🎉 Done! Images saved to src/images/");
}

downloadImages();
