import { ASTROLOGY_AI_RESPONSE_SCHEMA } from "./astrology-ai-insight-contract.ts";

const outputFields = [
  "headline",
  "synthesis",
  "evidenceFactIds",
  "patterns",
  "tensions",
  "focusSections",
  "reflectionQuestions",
  "suggestedFollowUps",
] as const;

type SchemaNode = Record<string, any>;

function resolveSchema(node: SchemaNode, root: SchemaNode): SchemaNode {
  if (typeof node.$ref !== "string") return node;
  const match = node.$ref.match(/^#\/definitions\/([A-Za-z0-9_-]+)$/);
  return match ? root.definitions?.[match[1]] ?? node : node;
}

function describeNode(path: string, source: SchemaNode, root: SchemaNode, depth = 0): string[] {
  const node = resolveSchema(source, root);
  const lines: string[] = [];
  const indent = "  ".repeat(depth);
  const constraints: string[] = [];

  if (node.type === "string") {
    if (Number.isInteger(node.minLength) || Number.isInteger(node.maxLength)) {
      constraints.push(`${node.minLength ?? 0}–${node.maxLength ?? "unbounded"} characters`);
    }
    if (node.enum) constraints.push(`one of ${node.enum.map((value: unknown) => JSON.stringify(value)).join(", ")}`);
    if (node.const !== undefined) constraints.push(`exactly ${JSON.stringify(node.const)}`);
    if (node.pattern) constraints.push(`must match ${node.pattern}`);
  } else if (node.type === "array") {
    constraints.push(`${node.minItems ?? 0}–${node.maxItems ?? "unbounded"} items`);
    if (node.uniqueItems) constraints.push("unique items");
  } else if (node.type === "object") {
    constraints.push(`object with required keys: ${(node.required ?? []).join(", ") || "none"}`);
    if (node.additionalProperties === false) constraints.push("no extra keys");
  } else if (node.const !== undefined) {
    constraints.push(`exactly ${JSON.stringify(node.const)}`);
  } else if (node.enum) {
    constraints.push(`one of ${node.enum.map((value: unknown) => JSON.stringify(value)).join(", ")}`);
  }

  lines.push(`${indent}${path}: ${node.type ?? "value"}${constraints.length ? ` (${constraints.join("; ")})` : ""}`);

  if (node.type === "object" && node.properties) {
    for (const [key, child] of Object.entries(node.properties)) {
      if ((node.required ?? []).includes(key)) lines.push(...describeNode(`${path}.${key}`, child as SchemaNode, root, depth + 1));
    }
  } else if (node.type === "array" && node.items) {
    lines.push(...describeNode(`${path}[]`, node.items, root, depth + 1));
  }

  return lines;
}

/** Compact, schema-derived bounds for the model prompt; runtime validation remains authoritative. */
export function astrologyAiOutputGuidance() {
  const root = ASTROLOGY_AI_RESPONSE_SCHEMA as unknown as SchemaNode;
  return outputFields.flatMap((field) => describeNode(field, root.properties[field], root)).join("\n");
}
