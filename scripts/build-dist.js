const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const file of ["index.js", "browser.js", "index.d.ts"]) {
  fs.copyFileSync(path.join(rootDir, file), path.join(distDir, file));
}

fs.cpSync(path.join(rootDir, "assets"), path.join(distDir, "assets"), {
  recursive: true,
});
