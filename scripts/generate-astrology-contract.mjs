import fs from "node:fs";
import Ajv from "ajv";
import standalone from "ajv/dist/standalone/index.js";
const schema = JSON.parse(fs.readFileSync("packages/astrology-core/chart.schema.json","utf8"));
const ajv = new Ajv({code:{source:true,esm:true},allErrors:true});
const code = "// Generated from chart.schema.json. Do not edit.\nimport {unicodeLength,structuralEqual} from './validation-runtime.mjs';\n" + standalone(ajv,ajv.compile(schema))
 .replaceAll('require("ajv/dist/runtime/ucs2length").default','unicodeLength')
 .replaceAll('require("ajv/dist/runtime/equal").default','structuralEqual');
const path = "packages/astrology-core/schema-validator.mjs";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(path,"utf8") !== code) throw new Error("Astrology schema consumer drift");
} else fs.writeFileSync(path,code);
// Static data import works in Node, Metro and Hermes without import attributes.
const table = JSON.parse(fs.readFileSync("packages/astrology-core/tai-utc.json","utf8"));
const tableCode = "// Generated from tai-utc.json.\nexport default " + JSON.stringify(table)+";\n";
const tablePath = "packages/astrology-core/tai-utc-data.mjs";
if (process.argv.includes("--check")) { if(fs.readFileSync(tablePath,"utf8") !== tableCode) throw new Error("Timescale table drift"); }
else fs.writeFileSync(tablePath,tableCode);
console.log("Astrology static schema and timescale consumers match");
