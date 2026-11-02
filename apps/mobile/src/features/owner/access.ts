export const adminRoles = ["owner", "admin", "editor", "safety_reviewer"] as const;
/** Vietnamese names for the Owner hub (analysis PR-07); unknown codes stay as they are. */
export const adminRoleLabels: Record<typeof adminRoles[number], string> = {
  owner: "Chủ sở hữu",
  admin: "Quản trị viên",
  editor: "Biên tập viên",
  safety_reviewer: "Người duyệt an toàn"
};

export function adminRoleLabel(role: string): string {
  return adminRoleLabels[role as typeof adminRoles[number]] ?? role;
}

export const adminCapabilities = ["hub.read", "content.read", "content.draft", "content.publish", "content.delete", "ai.read", "ai.manage", "roles.manage", "overview.read", "notifications.dispatch", "safety.review"] as const;
export type AdminAccess = { userId: string; roles: string[]; capabilities: string[] };

/** UI presentation only. The database rechecks every privileged operation. */
export function parseAdminAccess(value: unknown, userId: string): AdminAccess {
  const data = value as Partial<AdminAccess> | null;
  if (!data || data.userId !== userId || !Array.isArray(data.roles) || !Array.isArray(data.capabilities)
    || data.roles.some(role => !adminRoles.includes(role as typeof adminRoles[number]))
    || data.capabilities.some(cap => !adminCapabilities.includes(cap as typeof adminCapabilities[number]))) {
    throw new Error("Invalid admin access response");
  }
  if (!data.roles.length && data.capabilities.length) throw new Error("Missing admin role");
  return { userId, roles: data.roles, capabilities: data.capabilities };
}

export function adminWorkspaceUrl(base: string | undefined, workspace: "content" | "ai-studio", allowLocal = false): string | null {
  if (!base) return null;
  try {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(allowLocal && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
    url.hash = workspace === "content" ? "/content/personas" : "/ai-studio/workflow";
    return url.toString();
  } catch { return null; }
}
