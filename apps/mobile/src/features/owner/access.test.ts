import { adminWorkspaceUrl, parseAdminAccess } from "./access";
test("accepts multi-role capability response bound to current account", () => {
  expect(parseAdminAccess({ userId: "A", roles: ["editor", "safety_reviewer"], capabilities: ["hub.read", "content.draft", "safety.review"] }, "A").roles).toHaveLength(2);
});
test("fails closed on old contracts, foreign identity, and unknown roles", () => {
  for (const value of [null, { role: "owner" }, { userId: "B", roles: ["owner"], capabilities: ["hub.read"] }, { userId: "A", roles: ["content_admin"], capabilities: [] }, { userId: "A", roles: [], capabilities: ["hub.read"] }]) expect(() => parseAdminAccess(value, "A")).toThrow();
});
test("admin links never carry tokens, credentials or arbitrary schemes", () => {
  for (const url of ["javascript:alert(1)", "https://u:p@example.test", "https://example.test?token=x", "https://example.test#token=x", "http://example.test"]) expect(adminWorkspaceUrl(url, "content")).toBeNull();
  expect(adminWorkspaceUrl("https://admin.example.test/", "content")).toBe("https://admin.example.test/#/content/personas");
  expect(adminWorkspaceUrl("http://localhost:4173", "ai-studio", true)).toBe("http://localhost:4173/#/ai-studio/workflow");
});
