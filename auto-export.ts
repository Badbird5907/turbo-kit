// This script is used to automatically generate the exports for a package.
// It's especially useful for packages like ./packages/ui where we want to export all the components.
// Use it like this: pnpm auto-export | or pnpm auto-export <package-name>
// Add `"autoexport": true` to opt-in this script for a package.
// Add `// @no-auto-export` to the first line of a file to opt-out of this script for a file.

import * as fs from "fs";
import * as path from "path";

interface PackageJson {
  autoexport?: boolean;
  exports?: Record<string, string>;
  [key: string]: unknown;
}

function generateExports(packageName: string) {
  // Determine the correct package directory path
  // If we're already in a packages/* directory, use current directory
  // Otherwise, look for packages/packageName from root
  const cwd = process.cwd();
  let packageDir: string;
  
  if (cwd.includes(path.sep + "packages" + path.sep + packageName)) {
    // We're already in the package directory
    packageDir = cwd;
  } else if (fs.existsSync(path.join("packages", packageName))) {
    // We're in the root directory
    packageDir = path.join("packages", packageName);
  } else {
    console.log(`Skipping ${packageName} - not found`);
    return;
  }
  
  if (!fs.existsSync(packageDir) || !fs.statSync(packageDir).isDirectory()) {
    console.log(`Skipping ${packageName} - not a directory`);
    return;
  }

  const packageJsonPath = path.join(packageDir, "package.json");
  const srcDir = path.join(packageDir, "src");

  if (!fs.existsSync(packageJsonPath)) {
    console.log(`Skipping ${packageName} - no package.json found`);
    return;
  }

  if (!fs.existsSync(srcDir)) {
    console.log(`Skipping ${packageName} - no src directory found`);
    return;
  }

  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
  const packageJson: PackageJson = JSON.parse(packageJsonContent);

  if (!packageJson.autoexport) {
    console.log(`Skipping ${packageName} because autoexport is false or not set`);
    return;
  }

  const tsFiles: string[] = [];

  function walkDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walkDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const fileContent = fs.readFileSync(fullPath, "utf-8");
        const firstLine = fileContent.split("\n")[0];

        if (firstLine?.includes("// @no-auto-export")) {
          console.log(`Skipping ${entry.name} because it is marked with // @no-auto-export`);
          continue;
        }

        const relativePath = path.relative(srcDir, fullPath);
        const normalizedPath = relativePath.replace(/\\/g, "/");
        tsFiles.push(normalizedPath);
      }
    }
  }

  walkDirectory(srcDir);

  const exports: Record<string, string> = { ".": "./src/index.ts" };

  for (const tsFile of tsFiles) {
    const exportKey = `./${tsFile.replace(/\.(ts|tsx)$/, "")}`;
    exports[exportKey] = `./src/${tsFile}`;
  }

  packageJson.exports = exports;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

  console.log(`✅ Updated exports for ${packageName}`);
}

const args = process.argv.slice(2);
const targetPackage = args[0];

if (targetPackage) {
  console.log(`Generating exports for package: ${targetPackage}`);
  generateExports(targetPackage);
} else {
  console.log("Generating exports for all packages...");
  const packagesDir = "packages";

  if (!fs.existsSync(packagesDir)) {
    console.error("❌ packages directory not found");
    process.exit(1);
  }

  const packages = fs.readdirSync(packagesDir);

  for (const pkg of packages) {
    generateExports(pkg);
  }
}

console.log("✨ Done!");

