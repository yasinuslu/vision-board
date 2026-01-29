import { serve } from "bun";
import { join } from "node:path";
import index from "./index.html";

const IMAGES_DIR = join(import.meta.dir, "images");
const NEW_IMAGES_DIR = join(import.meta.dir, "new-images");

const server = serve({
  routes: {
    // Serve images from the images folder
    "/images/:filename": async (req) => {
      const filename = req.params.filename;
      const filepath = join(IMAGES_DIR, filename);
      const file = Bun.file(filepath);

      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": file.type },
        });
      }

      return new Response("Not found", { status: 404 });
    },

    // Serve images from the new-images folder
    "/new-images/:filename": async (req) => {
      const filename = req.params.filename;
      const filepath = join(NEW_IMAGES_DIR, filename);
      const file = Bun.file(filepath);

      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": file.type },
        });
      }

      return new Response("Not found", { status: 404 });
    },

    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from browser to server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
