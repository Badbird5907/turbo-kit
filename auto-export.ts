// This script is used to automatically generate the exports for a package.
// It's especially useful for packages like ./packages/ui where we want to export all the components.
// Use it like this: pnpm auto-export | or pnpm auto-export <package-name>
// Add `"autoexport": true` to opt-in this script for a package.
// Or configure it with: `"autoexport": { "srcDir": "emails", "enable": true }`
// Add `// @no-auto-export` to the first line of a file to opt-out of this script for a file.

import * as fs from "fs";
import * as path from "path";

interface AutoExportConfig {
  srcDir?: string;
  enable: boolean;
}

interface PackageJson {
  autoexport?: boolean | AutoExportConfig;
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

  if (!fs.existsSync(packageJsonPath)) {
    console.log(`Skipping ${packageName} - no package.json found`);
    return;
  }

  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
  const packageJson: PackageJson = JSON.parse(packageJsonContent);

  // Parse autoexport configuration
  let autoExportEnabled = false;
  let configuredSrcDir: string | null = null;

  if (typeof packageJson.autoexport === "boolean") {
    autoExportEnabled = packageJson.autoexport;
  } else if (typeof packageJson.autoexport === "object" && packageJson.autoexport !== null) {
    autoExportEnabled = packageJson.autoexport.enable === true;
    configuredSrcDir = packageJson.autoexport.srcDir || null;
  }

  if (!autoExportEnabled) {
    console.log(`Skipping ${packageName} because autoexport is false or not set`);
    return;
  }

  // Determine the source directory to use
  let baseDir: string;
  let exportPrefix: string;

  if (configuredSrcDir) {
    // Use explicitly configured srcDir
    const customSrcDir = path.join(packageDir, configuredSrcDir);
    if (!fs.existsSync(customSrcDir) || !fs.statSync(customSrcDir).isDirectory()) {
      console.log(`Skipping ${packageName} - configured srcDir "${configuredSrcDir}" does not exist`);
      return;
    }
    baseDir = customSrcDir;
    exportPrefix = `./${configuredSrcDir}/`;
  } else {
    // Default behavior: check for src/ directory, otherwise use package root
    const srcDir = path.join(packageDir, "src");
    const hasSrcDir = fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory();
    baseDir = hasSrcDir ? srcDir : packageDir;
    exportPrefix = hasSrcDir ? "./src/" : "./";
  }

  const tsFiles: string[] = [];

  function walkDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, dist, and other common build/dependency directories
      if (entry.isDirectory() && (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".cache" || entry.name === ".turbo")) {
        continue;
      }

      if (entry.isDirectory()) {
        walkDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const fileContent = fs.readFileSync(fullPath, "utf-8");
        const firstLine = fileContent.split("\n")[0];

        if (firstLine?.includes("// @no-auto-export")) {
          console.log(`Skipping ${entry.name} because it is marked with // @no-auto-export`);
          continue;
        }

        const relativePath = path.relative(baseDir, fullPath);
        const normalizedPath = relativePath.replace(/\\/g, "/");
        tsFiles.push(normalizedPath);
      }
    }
  }

  walkDirectory(baseDir);

  // Determine the main export path
  let mainIndexPath: string | null = null;
  if (configuredSrcDir) {
    // Check for index.ts in the configured srcDir
    const indexPath = path.join(baseDir, "index.ts");
    if (fs.existsSync(indexPath)) {
      mainIndexPath = `${exportPrefix}index.ts`;
    }
  } else {
    // Default behavior: check src/index.ts or root index.ts
    const srcIndexPath = path.join(packageDir, "src", "index.ts");
    const rootIndexPath = path.join(packageDir, "index.ts");
    if (fs.existsSync(srcIndexPath)) {
      mainIndexPath = "./src/index.ts";
    } else if (fs.existsSync(rootIndexPath)) {
      mainIndexPath = "./index.ts";
    }
  }
  
  const exports: Record<string, string> = {};
  
  if (mainIndexPath) {
    exports["."] = mainIndexPath;
  }

  for (const tsFile of tsFiles) {
    // Generate export key: when using a configured srcDir, keys are relative to that dir
    // (without the srcDir prefix). Otherwise, keys include the full path.
    let exportKeyPath = tsFile.replace(/\.(ts|tsx)$/, "");
    
    // Skip index.ts if it's already used as the main export
    if (exportKeyPath === "index" && mainIndexPath) {
      continue;
    }
    
    // When configuredSrcDir is set, tsFile is already relative to that dir, so use it directly
    // When not set, tsFile is relative to baseDir (which may be src/ or package root)
    const exportKey = `./${exportKeyPath}`;
    exports[exportKey] = `${exportPrefix}${tsFile}`;
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

