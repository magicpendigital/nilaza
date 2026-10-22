import { createClient } from "@supabase/supabase-js";
import { createPasswordRecovery, isRecoveryUrl, recoveryRedirectUrl } from "../passwordRecovery";
const mockAuth = {
  setSession: jest.fn(async () => ({ data: { session: {} }, error: null })),
  getUser: jest.fn(async () => ({ data: { user: { id: "synthetic-user" } }, error: null })),
  updateUser: jest.fn(async () => ({ error: null })),
  signOut: jest.fn(async () => ({ error: null }))
};
jest.mock("../../runtimeConfig", () => ({ isSupabaseAuthConfigured: true, supabaseUrl: "https://qa.invalid", supabaseAnonKey: "public-test" }));
jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn(() => ({ auth: mockAuth })) }));
const url = "nilaza://auth/recovery#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh";
beforeEach(() => jest.clearAllMocks());
it("accepts only the dedicated native callback", () => {
  expect(recoveryRedirectUrl()).toBe("nilaza://auth/recovery");
  expect(isRecoveryUrl(url)).toBe(true);
  for (const invalid of ["nilaza://auth/login", "nilaza://attacker/recovery", "https://attacker.test/?recovery=1", "invalid"]) expect(isRecoveryUrl(invalid)).toBe(false);
});
it("uses an ephemeral client and rejects update before verified recovery", async () => {
  const recovery = createPasswordRecovery();
  expect(createClient).toHaveBeenLastCalledWith("https://qa.invalid", "public-test", expect.objectContaining({ auth: expect.objectContaining({ persistSession: false, detectSessionInUrl: false, autoRefreshToken: false }) }));
  await expect(recovery.update("synthetic-password", "synthetic-password")).rejects.toThrow("link");
  await expect(recovery.accept(url.replace("type=recovery", "type=signup"))).rejects.toThrow("link");
  expect(mockAuth.updateUser).not.toHaveBeenCalled();
});
it("checks the server user, validates confirmation, and clears the recovery session", async () => {
  const recovery = createPasswordRecovery();
  await recovery.accept(url);
  expect(mockAuth.getUser).toHaveBeenCalledTimes(1);
  await expect(recovery.update("short", "short")).rejects.toThrow("length");
  await expect(recovery.update("synthetic-password", "different")).rejects.toThrow("match");
  await recovery.update("synthetic-password", "synthetic-password");
  expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: "local" });
  await expect(recovery.update("synthetic-password", "synthetic-password")).rejects.toThrow("link");
});
it("does not permit reset on an expired link", async () => {
  const recovery = createPasswordRecovery();
  mockAuth.setSession.mockResolvedValueOnce({ data: { session: null }, error: new Error("expired") } as never);
  await expect(recovery.accept(url)).rejects.toThrow("link");
  await expect(recovery.update("synthetic-password", "synthetic-password")).rejects.toThrow("link");
});
