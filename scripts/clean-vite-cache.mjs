import fs from "node:fs";
import path from "node:path";

const viteCacheDir = path.join(process.cwd(), "node_modules", ".vite");

if (fs.existsSync(viteCacheDir)) {
  fs.rmSync(viteCacheDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
}
