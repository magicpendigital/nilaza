// Pure parts of admin-team-invite: request validation, the redirect check and the fixed error mapping.
// The database repeats every check (20261114090000_admin_team_roles.sql); these only answer early and plainly.
export const TEAM_MIGRATION = "20261114090000_admin_team_roles.sql";
export const REDIRECT_ENV = "ADMIN_INVITE_REDIRECT_URL";
export const ADMIN_ROLES = ["owner", "admin", "editor", "safety_reviewer"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export type InviteRequest = { email: string; role: AdminRole; confirmOwner: boolean };
export type ParseResult =
  | { ok: true; value: InviteRequest }
  | { ok: false; error: "invalid_request" | "invalid_email" | "invalid_role" | "owner_confirm_required" };

// Same rule as nilaza_private.admin_team_email_ok: 3-254 characters, one @, a dot in the domain, no spaces or
// control characters, and the last label is not empty.
const EMAIL = /^[^@\s\p{Cc}]+@[^@\s\p{Cc}]+\.[^@\s\p{Cc}.]+$/u;
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL.test(email)) return null;
  return email;
}

export function parseInviteRequest(body: unknown): ParseResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_request" };
  const input = body as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (!["email", "role", "confirmOwner"].includes(key)) return { ok: false, error: "invalid_request" };
  }
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "invalid_email" };
  const role = input.role;
  if (typeof role !== "string" || !(ADMIN_ROLES as readonly string[]).includes(role)) return { ok: false, error: "invalid_role" };
  if (input.confirmOwner !== undefined && typeof input.confirmOwner !== "boolean") return { ok: false, error: "invalid_request" };
  const confirmOwner = input.confirmOwner === true;
  if (role === "owner" && !confirmOwner) return { ok: false, error: "owner_confirm_required" };
  return { ok: true, value: { email, role: role as AdminRole, confirmOwner } };
}

// The invite link lands on the Admin recovery page, where the new member sets a password. Only an https URL without
// credentials, query or fragment is used (http only for a local Admin); anything else counts as "not configured".
export function inviteRedirect(value: string | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  return url.href;
}

// Database / PostgREST codes -> a fixed HTTP answer. Raw server text is never returned.
export function mapRpcError(code: unknown): { status: number; error: string; migration?: string } {
  switch (typeof code === "string" ? code : "") {
    case "42501": return { status: 403, error: "not_authorized" };
    case "22023": return { status: 400, error: "invalid_request" };
    case "NZT01": return { status: 409, error: "self_change" };
    case "NZT02": return { status: 409, error: "last_owner" };
    case "NZT03": return { status: 400, error: "owner_confirm_required" };
    case "NZT04": return { status: 404, error: "member_not_found" };
    case "NZT05": return { status: 429, error: "invite_limit" };
    case "NZT06": return { status: 409, error: "email_unconfirmed" };
    case "PGRST202":
    case "42883": return { status: 503, error: "migration_missing", migration: TEAM_MIGRATION };
    default: return { status: 500, error: "invite_failed" };
  }
}
