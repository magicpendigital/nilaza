import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const apkRelativePath = process.argv[2] || "apps/mobile/android/app/build/outputs/apk/release/app-release.apk";
const apkPath = path.join(root, apkRelativePath);
if (!fs.existsSync(apkPath)) throw new Error(`Release artifact not found: ${apkRelativePath}`);

const app = JSON.parse(fs.readFileSync(path.join(root, "apps", "mobile", "app.json"), "utf8")).expo;
const sha256 = crypto.createHash("sha256").update(fs.readFileSync(apkPath)).digest("hex");
const git = (args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unavailable";
  }
};

const manifest = {
  artifact: path.relative(root, apkPath).replaceAll("\\", "/"),
  generatedAt: new Date().toISOString(),
  appVersion: app.version,
  androidVersionCode: app.android?.versionCode,
  iosBuildNumber: app.ios?.buildNumber,
  sha256,
  sourceRevision: git(["rev-parse", "HEAD"]),
  sourceState: git(["status", "--short"]) ? "has_uncommitted_changes" : "clean",
  requiredEvidence: [
    "Mobile quality CI passed after the source branch was pushed.",
    "Device cold start and stated manager test path passed.",
    "This artifact is internal QA unless it is built and signed through the approved EAS production path."
  ]
};
const outputPath = path.join(path.dirname(apkPath), "app-release.manifest.json");
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote release manifest: ${path.relative(root, outputPath)}`);
console.log(`SHA-256: ${sha256}`);
