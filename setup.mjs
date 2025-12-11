#!/usr/bin/env node

import { readdir, readFile, writeFile, stat, access, unlink } from "node:fs/promises";
import { join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

// Color functions
const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;
const success = (text) => colorize(text, "green");
const error = (text) => colorize(text, "red");
const warning = (text) => colorize(text, "yellow");
const info = (text) => colorize(text, "white");
const bright = (text) => colorize(text, "bright");
const dim = (text) => colorize(text, "dim");

// Gradient function for text
function gradient(text, startColor, endColor) {
  const start = [parseInt(startColor.slice(1, 3), 16), parseInt(startColor.slice(3, 5), 16), parseInt(startColor.slice(5, 7), 16)];
  const end = [parseInt(endColor.slice(1, 3), 16), parseInt(endColor.slice(3, 5), 16), parseInt(endColor.slice(5, 7), 16)];
  let result = "";
  
  for (let i = 0; i < text.length; i++) {
    const ratio = i / (text.length - 1 || 1);
    const r = Math.round(start[0] + (end[0] - start[0]) * ratio);
    const g = Math.round(start[1] + (end[1] - start[1]) * ratio);
    const b = Math.round(start[2] + (end[2] - start[2]) * ratio);
    result += `\x1b[38;2;${r};${g};${b}m${text[i]}\x1b[0m`;
  }
  
  return result;
}

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  ".cache",
  "coverage",
]);

const EXCLUDED_FILES = new Set([
  // "pnpm-lock.yaml",
  // "package-lock.json",
  // "yarn.lock",
  // "bun.lockb",
  // we can search and replace lock files too
  "README.md",
]);

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".mdx",
  ".yml",
  ".yaml",
  ".toml",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".xml",
  ".txt",
  ".env",
  ".config",
  ".hbs",
  ".mjs",
  ".cjs",
  ".sh",
  ".bash",
  ".fish",
  ".zsh",
]);

const TEXT_FILES_NO_EXT = new Set([
  "Dockerfile",
  "Makefile",
  "Procfile",
  "LICENSE",
  "README",
  "CHANGELOG",
  "CONTRIBUTING",
  ".gitignore",
  ".dockerignore",
  ".prettierrc",
  ".eslintrc",
  ".babelrc",
]);

async function getAllFiles(dir, fileList = []) {
  const files = await readdir(dir);

  for (const file of files) {
    if (file.startsWith(".") || EXCLUDED_DIRS.has(file)) {
      continue;
    }

    const filePath = join(dir, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      await getAllFiles(filePath, fileList);
    } else if (!EXCLUDED_FILES.has(file)) {
      const hasTextExtension = TEXT_EXTENSIONS.has(
        file.substring(file.lastIndexOf(".")),
      );
      const isKnownTextFile = TEXT_FILES_NO_EXT.has(file);

      if (hasTextExtension || isKnownTextFile) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

async function replaceInFile(filePath, oldName, newName) {
  try {
    const content = await readFile(filePath, "utf8");
    const newContent = content.replaceAll(oldName, newName);

    if (content !== newContent) {
      await writeFile(filePath, newContent, "utf8");
      return true;
    }
    return false;
  } catch (error) {
    return false; // skip bin files
  }
}

async function detectCurrentScope() {
  try {
    const rootPkgJson = await readFile(
      join(process.cwd(), "package.json"),
      "utf8",
    );
    const match = rootPkgJson.match(/@[\w-]+\/[\w-]+/);
    return match ? match[0].split("/")[0] : "@acme";
  } catch {
    return "@acme";
  }
}

async function checkNodeModules() {
  try {
    await access(join(process.cwd(), "node_modules"));
    return true;
  } catch {
    return false;
  }
}

async function detectPackageManager() {
  const rootDir = process.cwd();
  const lockFiles = {
    npm: join(rootDir, "package-lock.json"),
    pnpm: join(rootDir, "pnpm-lock.yaml"),
    yarn: join(rootDir, "yarn.lock"),
    bun: join(rootDir, "bun.lockb"),
  };

  const foundLockFiles = [];
  
  for (const [pm, lockPath] of Object.entries(lockFiles)) {
    try {
      await access(lockPath);
      foundLockFiles.push(pm);
    } catch {
      // no lockfile
    }
  }

  if (foundLockFiles.length === 0) {
    // no lockfile
    return null;
  }

  if (foundLockFiles.length > 1) {
    return { error: true, lockFiles: foundLockFiles };
  }

  return foundLockFiles[0];
}

async function getPackageManager() {
  const pmResult = await detectPackageManager();
  
  // If multiple lock files found or no lockfile found, ask the user
  if ((pmResult && pmResult.error) || !pmResult) {
    const rl = createInterface({ input, output });
    
    if (pmResult && pmResult.error) {
      console.log(warning("!!! Multiple lock files detected !!!"));
      console.log(info(`Found lock files for: ${pmResult.lockFiles.join(", ")}`));
      console.log(info("Which package manager would you like to use?"));
    } else {
      console.log(info("\nNo lockfile detected. Which package manager would you like to use?"));
    }
    
    const answer = await rl.question(colorize("(npm/pnpm/yarn/bun, default: pnpm): ", "cyan"));
    rl.close();
    const pm = answer.trim().toLowerCase() || "pnpm";
    const validPms = ["npm", "pnpm", "yarn", "bun"];
    if (validPms.includes(pm)) {
      return pm;
    }
    console.log(warning(`Invalid choice "${pm}", defaulting to pnpm.`));
    return "pnpm";
  }

  return pmResult ?? "pnpm";
}

async function deleteSetupScript() {
  try {
    const scriptPath = fileURLToPath(import.meta.url);
    await unlink(scriptPath);
    return true;
  } catch (err) {
    return false;
  }
}

async function runInstallCommand(fullCommand) {
  return new Promise((resolve, reject) => {
    const child = spawn(fullCommand, [], {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  // Check if node_modules exists
  const hasNodeModules = await checkNodeModules();
  if (hasNodeModules) {
    const rl = createInterface({ input, output });
    console.log(warning("!!! node_modules directory detected !!!"));
    console.log(info("The setup script will perform find-and-replace operations in lockfiles."));
    console.log(info("Please delete node_modules and re-run this script to ensure consistency.\n"));
    const answer = await rl.question(colorize("Would you like to exit now? (yes/no, default: yes): ", "yellow"));
    rl.close();
    if (answer.trim().toLowerCase() !== "no") {
      console.log(info("Exiting. Please delete node_modules and re-run the script."));
      process.exit(0);
    }
  }

  const currentScope = await detectCurrentScope();
  
  if (currentScope !== "@acme" && !process.env.PACKAGE_SCOPE) {
    console.log(warning("Setup has already been run! Skipping..."));
    return;
  }

  let newScope;

  if (process.env.PACKAGE_SCOPE) {
    newScope = process.env.PACKAGE_SCOPE;
    console.log(info(`Using package scope from environment: ${bright(newScope)}\n`));
  } else {
    const rl = createInterface({ input, output });
    newScope = await rl.question(
      colorize(`Enter your package scope (default: ${currentScope}): `, "cyan"),
    );
    rl.close();
    newScope = newScope.trim() || currentScope;
  }

  if (newScope && !newScope.startsWith("@")) {
    newScope = `@${newScope}`;
  }

  newScope = newScope.replace(/\/$/, ""); // remove trailing slash

  if (newScope === currentScope) {
    console.log(info(`No changes needed. Using default scope: ${bright(currentScope)}`));
    return;
  }

  console.log(info(`Replacing "${currentScope}" with "${newScope}"...`));

  const rootDir = process.cwd();
  const files = await getAllFiles(rootDir);

  let filesChanged = 0;

  for (const file of files) {
    if (file.endsWith("setup.mjs")) { // skip this script
      continue;
    }

    const changed = await replaceInFile(file, currentScope, newScope);
    if (changed) {
      filesChanged++;
      const relativePath = relative(rootDir, file);
      console.log(`  ${success("✓")} ${dim(relativePath)}`);
    }
  }

  console.log(success(`\n${gradient("Done!", "#4F46E5", "#EC4899")} ${info("Updated")} ${bright(filesChanged.toString())} ${info("file(s).")}`));
  
  if (filesChanged > 0) {
    const rl = createInterface({ input, output });
    const answer = await rl.question(colorize("\nWould you like to install dependencies now? (yes/no, default: yes): ", "cyan"));
    rl.close();
    
    const packageManager = await getPackageManager();
    
    if (answer.trim().toLowerCase() !== "no") {
      const installCommand = packageManager === "npm" ? "npm install" :
                            packageManager === "yarn" ? "yarn install" :
                            packageManager === "bun" ? "bun install" :
                            "pnpm install";
      
      console.log(info(`\nInstalling dependencies using ${bright(packageManager)}...`));
      try {
        await runInstallCommand(installCommand);
        console.log(success("\n✓ Dependencies installed successfully!"));
        console.log(bright("\nNext steps:"));
        console.log(`  ${info("1.")} Configure your environment (.env file)`);
        console.log(`  ${info("2.")} Run: ${bright(`${packageManager} db:push`)}`);
        console.log(`  ${info("3.")} Run: ${bright(`${packageManager} dev`)}`);
      } catch (err) {
        console.error(error(`\nError installing dependencies: ${err.message}`));
        console.log(bright("\nNext steps:"));
        console.log(`  ${info("1.")} Run: ${bright(installCommand)}`);
        console.log(`  ${info("2.")} Configure your environment (.env file)`);
        console.log(`  ${info("3.")} Run: ${bright(`${packageManager} db:push`)}`);
        console.log(`  ${info("4.")} Run: ${bright(`${packageManager} dev`)}`);
      }
    } else {
      const installCommand = packageManager === "npm" ? "npm install" :
                            packageManager === "yarn" ? "yarn install" :
                            packageManager === "bun" ? "bun install" :
                            "pnpm install";
      console.log(bright("\nNext steps:"));
      console.log(`  ${info("1.")} Run: ${bright(installCommand)}`);
      console.log(`  ${info("2.")} Configure your environment (.env file)`);
      console.log(`  ${info("3.")} Run: ${bright(`${packageManager} db:push`)}`);
      console.log(`  ${info("4.")} Run: ${bright(`${packageManager} dev`)}`);
    }
  }

  if (process.env.KEEP_SETUP_SCRIPT !== "true" && filesChanged > 0) {
    const deleted = await deleteSetupScript();
    if (deleted) {
      console.log(dim("\n✓ Setup script deleted."));
    } else {
      console.log(warning("\n⚠ Could not delete setup script automatically. Please delete it manually."));
    }
  }
}

main().catch(async (err) => {
  console.error(error(`Error: ${err.message}`));
  process.exit(1);
});

