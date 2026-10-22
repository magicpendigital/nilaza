import responseSchema from "../../../../../packages/agent-config/astrology-ai-insight/response.schema.json";
import requestSchema from "../../../../../packages/agent-config/astrology-ai-insight/request.schema.json";
import contract from "../../../../../packages/agent-config/astrology-ai-insight/contract.json";
import type { AstrologyAiInsightResponse, AstrologyAiInvocation } from "./astrologyAiInsight";

type Schema = Record<string, any>;
const annotations = new Set(["$schema", "$id", "title", "description", "definitions"]);
const supported = new Set(["$ref", "type", "const", "enum", "required", "properties", "additionalProperties", "items", "minItems", "maxItems", "uniqueItems", "minLength", "maxLength", "pattern", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"]);
const record = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);

/** A bounded interpreter of the canonical schemas, not a second response schema. */
export function matchesAstrologyAiSchema(value: unknown, schema: Schema, root: Schema = schema): boolean {
  let nodes = 0;
  const match = (input: unknown, rule: Schema, depth: number): boolean => {
    if (++nodes > 12000 || depth > 40 || !record(rule)) return false;
    if (Object.keys(rule).some(key => !supported.has(key) && !annotations.has(key))) return false;
    if (rule.$ref) {
      if (typeof rule.$ref !== "string" || !rule.$ref.startsWith("#/")) return false;
      const target = rule.$ref.slice(2).split("/").reduce((part: any, key: string) => part?.[key], root);
      return match(input, target, depth + 1);
    }
    if (Object.prototype.hasOwnProperty.call(rule, "const") && input !== rule.const) return false;
    if (rule.enum && !rule.enum.includes(input)) return false;
    const isType = (type: string) => type === "null" ? input === null
      : type === "array" ? Array.isArray(input)
        : type === "object" ? record(input)
          : type === "integer" ? Number.isInteger(input)
            : type === "number" ? typeof input === "number" && Number.isFinite(input)
              : typeof input === type;
    if (rule.type && !(Array.isArray(rule.type) ? rule.type : [rule.type]).some(isType)) return false;
    if (typeof input === "string") {
      const length = Array.from(input).length;
      if (rule.minLength !== undefined && length < rule.minLength || rule.maxLength !== undefined && length > rule.maxLength) return false;
      if (rule.pattern && !new RegExp(rule.pattern).test(input)) return false;
    }
    if (typeof input === "number") {
      if (!Number.isFinite(input) || rule.minimum !== undefined && input < rule.minimum || rule.maximum !== undefined && input > rule.maximum
        || rule.exclusiveMinimum !== undefined && input <= rule.exclusiveMinimum || rule.exclusiveMaximum !== undefined && input >= rule.exclusiveMaximum) return false;
    }
    if (Array.isArray(input)) {
      if (input.length > 200 || rule.minItems !== undefined && input.length < rule.minItems || rule.maxItems !== undefined && input.length > rule.maxItems) return false;
      if (rule.uniqueItems && new Set(input.map(item => JSON.stringify(item))).size !== input.length) return false;
      if (rule.items && !input.every(item => match(item, rule.items, depth + 1))) return false;
    }
    if (record(input)) {
      if ((rule.required ?? []).some((key: string) => !Object.prototype.hasOwnProperty.call(input, key))) return false;
      if (Object.keys(input).length > 100 || rule.additionalProperties === false && Object.keys(input).some(key => !Object.prototype.hasOwnProperty.call(rule.properties ?? {}, key))) return false;
      for (const [key, property] of Object.entries(rule.properties ?? {})) {
        if (Object.prototype.hasOwnProperty.call(input, key) && !match(input[key], property as Schema, depth + 1)) return false;
      }
    }
    return true;
  };
  try { return match(value, schema, 0); } catch { return false; }
}

export type AstrologyAiSavedContext = Pick<AstrologyAiInvocation, "chart" | "selectedFactIds" | "facts" | "caveats">;

export function validAstrologyAiSavedContext(value: unknown): value is AstrologyAiSavedContext {
  if (!record(value) || Object.keys(value).sort().join(",") !== "caveats,chart,facts,selectedFactIds") return false;
  for (const key of ["chart", "selectedFactIds", "facts", "caveats"] as const) {
    if (!matchesAstrologyAiSchema(value[key], requestSchema.properties[key], requestSchema)) return false;
  }
  const facts = [...value.facts.placements, ...value.facts.aspects, ...value.facts.houses];
  if (value.facts.placements.some((item: any) => !item.factId.startsWith("placement."))
    || value.facts.aspects.some((item: any) => !item.factId.startsWith("aspect."))
    || value.facts.houses.some((item: any) => !item.factId.startsWith("house."))) return false;
  const factIds = new Set(facts.map(item => item.factId));
  const caveatIds = new Set(value.caveats.map((item: any) => item.id));
  return factIds.size === facts.length && caveatIds.size === value.caveats.length
    && value.selectedFactIds.every((id: string) => factIds.has(id))
    && facts.every(item => item.confidence.caveatIds.every((id: string) => caveatIds.has(id)))
    && value.caveats.every((item: any) => item.appliesToFactIds.every((id: string) => factIds.has(id)));
}

export function validAstrologyAiResponse(value: unknown, context: AstrologyAiSavedContext, expected?: { requestId?: string; language?: string }): value is AstrologyAiInsightResponse {
  if (!matchesAstrologyAiSchema(value, responseSchema) || !validAstrologyAiSavedContext(context)) return false;
  const response = value as AstrologyAiInsightResponse;
  if (response.metadata.promptVersionId !== contract.promptVersionId) return false;
  if (expected?.requestId && response.requestId !== expected.requestId || expected?.language && response.language !== expected.language) return false;
  if (response.metadata.reportRevision !== context.chart.reportRevision || response.metadata.calculationVersion !== context.chart.calculationVersion
    || response.metadata.chartContractVersion !== context.chart.contractVersion || !Number.isFinite(Date.parse(response.metadata.generatedAt))) return false;
  const selected = new Set(context.selectedFactIds), evidence = new Set(response.evidenceFactIds), caveats = new Set(context.caveats.map(item => item.id));
  if (response.evidenceFactIds.some(id => !selected.has(id))) return false;
  for (const group of [response.patterns, response.tensions, response.focusSections]) {
    if (new Set(group.map(item => item.id)).size !== group.length) return false;
    if (group.some(item => item.evidenceFactIds.some(id => !evidence.has(id) || !selected.has(id)) || item.caveatIds.some(id => !caveats.has(id)))) return false;
  }
  return true;
}
