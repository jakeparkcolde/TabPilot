import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import console from "node:console";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);
const manifest = JSON.parse(
  readFileSync(resolve(root, "dist/manifest.json"), "utf8"),
);

if (packageJson.version !== manifest.version) {
  throw new Error(
    `Version mismatch: package.json=${packageJson.version}, manifest=${manifest.version}`,
  );
}

if (manifest.manifest_version !== 3) {
  throw new Error("Chrome Web Store releases must use Manifest V3.");
}

if (manifest.description.length > 132) {
  throw new Error("Manifest description exceeds 132 characters.");
}

const releaseDirectory = resolve(root, "release");
const archive = resolve(
  releaseDirectory,
  `tabpilot-${manifest.version}-chrome-web-store.zip`,
);

rmSync(releaseDirectory, { recursive: true, force: true });
mkdirSync(releaseDirectory, { recursive: true });

execFileSync("zip", ["-qr", archive, "."], {
  cwd: resolve(root, "dist"),
  stdio: "inherit",
});

console.log(`Created ${archive}`);
