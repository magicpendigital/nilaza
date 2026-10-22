import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillsRoot = path.join(root, "skills");
const manifest = JSON.parse(fs.readFileSync(path.join(skillsRoot, "manifest.json"), "utf8"));
const errors = [];
const digest = (contents) => crypto.createHash("sha256").update(contents).digest("hex");
const listedSkills = new Set();
const listedFiles = new Set();
if (!Array.isArray(manifest.skills)) errors.push("Skill manifest needs a skills list");

function walkFiles(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(folder, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

for (const skill of manifest.skills || []) {
  if (!/^[a-z0-9-]+$/.test(skill.name) || listedSkills.has(skill.name)) {
    errors.push(`Invalid or duplicate skill name: ${skill.name}`);
    continue;
  }
  listedSkills.add(skill.name);
  const skillRoot = path.join(skillsRoot, skill.name);
  if (!fs.existsSync(skillRoot) || !fs.statSync(skillRoot).isDirectory()) {
    errors.push(`${skill.name} directory is missing`);
    continue;
  }
  const skillFile = path.join(skillRoot, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    errors.push(`${skill.name} is missing SKILL.md`);
    continue;
  }
  const contents = fs.readFileSync(skillFile, "utf8");
  const frontmatter = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!frontmatter) errors.push(`${skill.name} has invalid YAML frontmatter delimiters`);
  if (!new RegExp(`^name:\\s*${skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").test(frontmatter?.[1] || "")) {
    errors.push(`${skill.name} frontmatter name must match the manifest`);
  }
  if (!/^description:\s*.+/m.test(frontmatter?.[1] || "")) errors.push(`${skill.name} frontmatter needs a description`);
  if (!/^#\s+.+/m.test(contents.slice(frontmatter?.[0].length || 0))) errors.push(`${skill.name} needs a top-level Markdown heading`);

  for (const file of skill.files || []) {
    if (typeof file.path !== "string" || /[\\:*?\[\]]/.test(file.path) || file.path.startsWith("/") || file.path.split("/").some((part) => !part || part === "." || part === "..")) {
      errors.push(`${skill.name} has an unsafe manifest path`);
      continue;
    }
    if (listedFiles.has(`${skill.name}/${file.path}`)) errors.push(`${skill.name}/${file.path} is duplicated in the manifest`);
    listedFiles.add(`${skill.name}/${file.path}`);
    const filePath = path.join(skillRoot, file.path);
    if (!fs.existsSync(filePath)) {
      errors.push(`${skill.name}/${file.path} is missing`);
      continue;
    }
    if (fs.lstatSync(filePath).isSymbolicLink()) {
      errors.push(`${skill.name}/${file.path} must not be a symlink`);
      continue;
    }
    const actual = digest(fs.readFileSync(filePath)).toLowerCase();
    if (actual !== file.sha256.toLowerCase()) errors.push(`${skill.name}/${file.path} does not match its reviewed manifest hash`);
  }

  for (const filePath of walkFiles(skillRoot)) {
    const relativePath = path.relative(skillsRoot, filePath).replaceAll(path.sep, "/");
    if (!listedFiles.has(relativePath)) errors.push(`${relativePath} is not in the reviewed skill manifest`);
  }

  const agentPath = path.join(skillRoot, "agents", "openai.yaml");
  if (fs.existsSync(agentPath)) {
    const agent = fs.readFileSync(agentPath, "utf8");
    for (const key of ["interface:", "display_name:", "short_description:", "default_prompt:"]) {
      if (!agent.includes(key)) errors.push(`${skill.name}/agents/openai.yaml is missing ${key}`);
    }
  }
}

for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md")) && !listedSkills.has(entry.name)) {
    errors.push(`${entry.name} is a repository skill missing from the manifest`);
  }
}

if (errors.length) {
  console.error("Repository skill validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Repository skill validation passed (${manifest.skills.length} skills).`);
