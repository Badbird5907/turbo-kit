#!/usr/bin/env node

import { readdir, readFile, writeFile, stat, access } from "node:fs/promises";
import { join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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
      console.log("!!! Multiple lock files detected !!!");
      console.log(`Found lock files for: ${pmResult.lockFiles.join(", ")}`);
      console.log("Which package manager would you like to use?");
    } else {
      console.log("\nNo lockfile detected. Which package manager would you like to use?");
    }
    
    const answer = await rl.question("(npm/pnpm/yarn/bun, default: pnpm): ");
    rl.close();
    const pm = answer.trim().toLowerCase() || "pnpm";
    const validPms = ["npm", "pnpm", "yarn", "bun"];
    if (validPms.includes(pm)) {
      return pm;
    }
    console.log(`Invalid choice "${pm}", defaulting to pnpm.`);
    return "pnpm";
  }

  return pmResult ?? "pnpm";
}

async function deleteSetupScript() {
  const { unlink } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  try {
    await unlink(fileURLToPath(import.meta.url));
    return true;
  } catch (err) {
    return false;
  }
}

async function main() {
  // Check if node_modules exists
  const hasNodeModules = await checkNodeModules();
  if (hasNodeModules) {
    const rl = createInterface({ input, output });
    console.log("!!! node_modules directory detected !!!");
    console.log("The setup script will perform find-and-replace operations in lockfiles.");
    console.log("Please delete node_modules and re-run this script to ensure consistency.\n");
    const answer = await rl.question("Would you like to exit now? (yes/no, default: yes): ");
    rl.close();
    if (answer.trim().toLowerCase() !== "no") {
      console.log("Exiting. Please delete node_modules and re-run the script.");
      process.exit(0);
    }
  }

  const currentScope = await detectCurrentScope();
  
  if (currentScope !== "@acme" && !process.env.PACKAGE_SCOPE) {
    console.log("Setup has already been run! Skipping...");
    return;
  }

  let newScope;

  if (process.env.PACKAGE_SCOPE) {
    newScope = process.env.PACKAGE_SCOPE;
    console.log(`Using package scope from environment: ${newScope}\n`);
  } else {
    const rl = createInterface({ input, output });
    newScope = await rl.question(
      `Enter your package scope (default: ${currentScope}): `,
    );
    rl.close();
    newScope = newScope.trim() || currentScope;
  }

  if (newScope && !newScope.startsWith("@")) {
    newScope = `@${newScope}`;
  }

  newScope = newScope.replace(/\/$/, ""); // remove trailing slash

  if (newScope === currentScope) {
    console.log("No changes needed. Using default scope:", currentScope);
    return;
  }

  console.log(`Replacing "${currentScope}" with "${newScope}"...`);

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
      console.log(`  ✓ ${relativePath}`);
    }
  }

  console.log(`Done! Updated ${filesChanged} file(s).`);
  
  if (filesChanged > 0) {
    const rl = createInterface({ input, output });
    const answer = await rl.question("\nWould you like to install dependencies now? (yes/no, default: yes): ");
    rl.close();
    
    const packageManager = await getPackageManager();
    
    if (answer.trim().toLowerCase() !== "no") {
      const installCommand = packageManager === "npm" ? "npm install" :
                            packageManager === "yarn" ? "yarn install" :
                            packageManager === "bun" ? "bun install" :
                            "pnpm install";
      
      console.log(`\nInstalling dependencies using ${packageManager}...`);
      try {
        const { stdout, stderr } = await execAsync(installCommand);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        console.log("✓ Dependencies installed successfully!");
        console.log("Next steps:");
        console.log(`  1. Configure your environment (.env file)`);
        console.log(`  2. Run: ${packageManager} db:push`);
        console.log(`  3. Run: ${packageManager} dev`);
      } catch (error) {
        console.error("Error installing dependencies:", error.message);
        console.log("\nNext steps:");
        console.log(`  1. Run: ${installCommand}`);
        console.log("  2. Configure your environment (.env file)");
        console.log(`  3. Run: ${packageManager} db:push`);
        console.log(`  4. Run: ${packageManager} dev`);
      }
    } else {
      const installCommand = packageManager === "npm" ? "npm install" :
                            packageManager === "yarn" ? "yarn install" :
                            packageManager === "bun" ? "bun install" :
                            "pnpm install";
      console.log("\nNext steps:");
      console.log(`  1. Run: ${installCommand}`);
      console.log("  2. Configure your environment (.env file)");
      console.log(`  3. Run: ${packageManager} db:push`);
      console.log(`  4. Run: ${packageManager} dev`);
    }
  }
  
  
  if (process.env.KEEP_SETUP_SCRIPT === "false" && filesChanged > 0) {
    const { unlink } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    try {
      await unlink(fileURLToPath(import.meta.url));
      console.log("Setup script deleted.");
    } catch (err) {
      console.error("Could not delete setup script! Please delete it manually.\n", err.message);
    }
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});

