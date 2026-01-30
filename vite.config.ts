import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Check if we're in production (deployed to GitHub Pages)
const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [react()],
  // Only use base path in production (GitHub Pages)
  // In development, use relative paths
  base: isProduction ? "/vision-board/" : "/",
  server: {
    // Explicitly set host for development
    host: isProduction ? false : "localhost",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
