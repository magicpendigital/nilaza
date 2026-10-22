import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const app = JSON.parse(fs.readFileSync(path.join(root, "apps", "mobile", "app.json"), "utf8")).expo;
const gradlePath = path.join(root, "apps", "mobile", "android", "app", "build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf8");
const versionCode = gradle.match(/\bversionCode\s+(\d+)/)?.[1];
const versionName = gradle.match(/\bversionName\s+"([^"]+)"/)?.[1];
const errors = [];

if (!Number.isInteger(app.android?.versionCode) || app.android.versionCode < 1) errors.push("app.json Android versionCode must be a positive integer");
if (versionCode !== String(app.android?.versionCode)) errors.push(`Android Gradle versionCode (${versionCode || "missing"}) must match app.json (${app.android?.versionCode})`);
if (versionName !== app.version) errors.push(`Android Gradle versionName (${versionName || "missing"}) must match app.json (${app.version})`);
if (app.ios?.buildNumber !== String(app.android?.versionCode)) errors.push("iOS buildNumber must match the current Android versionCode for the shared internal release line");

if (errors.length) {
  console.error("Mobile release configuration validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Mobile release configuration passed: ${app.version} (Android ${app.android.versionCode}, iOS ${app.ios.buildNumber}).`);
