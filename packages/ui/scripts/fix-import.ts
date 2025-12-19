import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

// Find all TypeScript/TSX files in the src directory
const files = glob.sync("src/**/*.{ts,tsx}");

files.forEach((file) => {
  const content = readFileSync(file, "utf-8");

  // Replace both import patterns
  const updatedContent = content
    .replace(
      'import { cn } from "src/lib/utils"',
      'import { cn } from "@acme/ui"',
    )
    .replace(/from "src\/\/?([^"]+)"/g, 'from "@acme/ui/$1"');

  writeFileSync(file, updatedContent);
});