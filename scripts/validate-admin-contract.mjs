import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const manifest = JSON.parse(read("apps/admin/admin-capabilities.json"));
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const contentWorkspace = manifest.workspaces.find((item) => item.id === "content");
const aiWorkspace = manifest.workspaces.find((item) => item.id === "ai-studio");
const growthWorkspace = manifest.workspaces.find((item) => item.id === "growth");
assert(Boolean(contentWorkspace), "Capability manifest must retain Content Operations");
assert(Boolean(aiWorkspace), "Capability manifest must retain AI Studio");
assert(Boolean(growthWorkspace), "Capability manifest must add Growth Operations without replacing existing workspaces");
for (const [workspace, expectedRoutes] of [[contentWorkspace,["personas","decks","cards","assets","frontend"]],[aiWorkspace,["workflow","prompt","persona-studio","council-builder","model-router","test","versions","audit"]],[growthWorkspace,["overview","product-truth","content-drafts","measurement","roadmap","waitlist","campaign-map","delivery-health"]]]) {
  if (!workspace) continue;
  const routeIds = new Set(workspace.routes.map((route) => route.id));
  for (const route of expectedRoutes) assert(routeIds.has(route), `${workspace.id} is missing required route: ${route}`);
  assert(workspace.requiredCapabilities.length > 0, `${workspace.id} must declare required capabilities`);
}
const shell = read("apps/admin/index.html");
const shellJs = read("apps/admin/shell.js");
const contentHtml = read("apps/admin/content.html");
const contentJs = read("apps/admin/content.js");
const contentSync = read("apps/admin/content-sync.js");
const model = read("apps/admin/content-model.mjs");
const aiHtml = read("apps/admin/ai-studio.html");
const aiJs = read("apps/admin/app.js");
const growthHtml = read("apps/admin/growth.html");
const growthJs = read("apps/admin/growth.js");
const growthFixture = read("apps/admin/marketing-automation-sample.json");
assert(shell.includes("workspace-nav") && shell.includes("shell.js"), "Admin entry must remain the shared workspace shell");
assert(shellJs.includes("admin-capabilities.json"), "Shell navigation must be generated from the capability manifest");
assert(contentHtml.includes("content.js") && contentHtml.includes("workspace-guard.js"), "Content workspace must retain its module and route guard");
assert(contentSync.includes("admin_content_bundles") && contentSync.includes("publish_content_bundle"), "Content workspace must retain the Supabase versioned-bundle contract");
assert(contentJs.includes("OUTBOX_KEY") && contentJs.includes("syncFromServer") && contentJs.includes("publish-seed"), "Content workspace must retain online sync, offline outbox, and seed bootstrap actions");
assert(aiHtml.includes("app.js") && aiHtml.includes("workspace-guard.js"), "AI Studio must retain its module and route guard");
assert(growthHtml.includes("growth.js") && growthHtml.includes("workspace-guard.js"), "Growth workspace must retain its module and route guard");
for (const token of ["Live aggregate", "Review synthetic fixture", "get_growth_waitlist_overview", "suppression", "campaign-map", "delivery-health"]) assert(growthHtml.includes(token) || growthJs.includes(token) || growthFixture.includes(token), `Growth Operations contract token missing: ${token}`);
assert(growthWorkspace?.requiredCapabilities.includes("overview.read"), "Growth Operations must require overview.read");
assert(!growthFixture.includes("@"), "Growth Operations fixture must not contain email-like identifiers");
for (const token of ["createDraftPersona","createDraftDeck","updateEntity","publishEntity","archiveEntity","deleteEntity","canSafelyDelete","localStorage"]) assert(model.includes(token) || contentJs.includes(token), `Content admin contract token missing: ${token}`);
for (const token of ["assetPreview","data-asset-preview","Front-end preview","preview-fallback"]) assert(contentJs.includes(token), `Asset management preview contract missing: ${token}`);
for (const token of ["Persona Prompt Studio","Council Builder","Soạn prompt","Chọn model","Trace Explorer","Test Run","Phiên bản","Lịch sử thao tác"]) assert(aiHtml.includes(token) || aiJs.includes(token), `AI Studio contract token missing: ${token}`);
for (const token of ["councilTemplates","renderCouncilBuilderDetail","data-council-template","assembledCouncilConfig","assembledCouncilPublishPayload","ai_council_config_versions","ai_council_template_versions","personaSlug"]) assert(aiJs.includes(token), `AI Council Builder contract token missing: ${token}`);
assert(aiJs.includes("/functions/v1/") && aiJs.includes('adminFunctionEndpoint("admin-ai-council-config")') && aiJs.includes('adminFunctionEndpoint("admin-model-router-config")'), "AI Studio connectors must use the Supabase functions/v1 URL shape");
// A1 (AD-21): no Admin page asks for a JWT, anon key or endpoint URL; calls use the signed-in session.
for (const token of ["council-admin-jwt","council-admin-anon-key","council-admin-endpoint","model-router-admin-jwt","model-router-admin-endpoint"]) assert(!aiJs.includes(token) && !aiHtml.includes(token), `AI Studio must not render a pasted credential or endpoint field: ${token}`);
for (const page of fs.readdirSync(path.join(root, "apps/admin")).filter((file) => file.endsWith(".html"))) assert(/<html lang="vi"/.test(read(`apps/admin/${page}`)), `Admin page must default to Vietnamese: ${page}`);
assert(read("apps/admin/workspace-guard.js").includes("get_ai_trace_runs") && read("apps/admin/workspace-guard.js").includes("get_ai_trace_detail"), "AI trace RPCs must remain allowlisted behind ai.read");
assert(read("apps/admin/workspace-guard.js").includes('get_growth_waitlist_overview: "overview.read"'), "Growth aggregate RPC must remain allowlisted behind overview.read");
assert(read("apps/admin/AGENTS.md").includes("Do not replace one workspace"), "Nested AGENTS.md must preserve the additive-workspace invariant");
assert(read("apps/admin/README.md").includes("npm run admin:dev"), "Admin README must document the supported launch command");
// A2: one left navigation built from the manifest; the Overview workspace and the AI features module stay protected.
const overviewWorkspace = manifest.workspaces.find((item) => item.id === "overview");
assert(overviewWorkspace?.entry === "overview.html" && overviewWorkspace.requiredCapabilities.includes("hub.read"), "Overview workspace must stay declared with hub.read");
assert(read("apps/admin/overview.html").includes("workspace-guard.js") && read("apps/admin/overview.html").includes("overview.js"), "Overview workspace must retain its module and route guard");
assert(aiWorkspace?.routes.some((route) => route.id === "features") && aiHtml.includes("ai-features.js"), "AI Studio must keep the AI features route and module");
for (const [name, capability] of [["get_ai_feature_configs", "ai.read"], ["save_ai_feature_config_draft", "ai.manage|ai.read+content.draft"], ["publish_ai_feature_config", "ai.manage"], ["set_ai_feature_switch", "ai.manage"]]) assert(read("apps/admin/workspace-guard.js").includes(`${name}: "${capability}"`), `AI feature config RPC must stay allowlisted: ${name}`);
assert(shellJs.includes("navGroups") && shellJs.includes("routeAllowed"), "Shell must keep the single capability-filtered navigation");
if (errors.length) { console.error("Admin capability validation failed:"); errors.forEach((error) => console.error(`- ${error}`)); process.exit(1); }
console.log(`Admin capability contract passed: ${manifest.workspaces.length} workspaces, ${manifest.workspaces.flatMap((item)=>item.requiredCapabilities).length} capabilities.`);
