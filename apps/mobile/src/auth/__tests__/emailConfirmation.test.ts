import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { confirmationRedirectUrl, isConfirmationUrl, verifyEmailConfirmation } from "../emailConfirmation";
const mockGetUser = jest.fn(async (_token: string): Promise<any> => ({ data: { user: { email_confirmed_at: "2026-10-04T00:00:00Z" } }, error: null }));
jest.mock("../../runtimeConfig", () => ({ isSupabaseAuthConfigured: true, supabaseUrl: "https://qa.invalid", supabaseAnonKey: "public-test" }));
jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn(() => ({ auth: { getUser: mockGetUser } })) }));
const url = "nilaza://auth/confirm#type=signup&access_token=synthetic-access&refresh_token=synthetic-refresh";
beforeEach(() => jest.clearAllMocks());
it("accepts only the dedicated native confirmation path", () => {
  expect(confirmationRedirectUrl()).toBe("nilaza://auth/confirm");
  expect(isConfirmationUrl(url)).toBe(true);
  for (const value of ["nilaza://auth/recovery", "nilaza://attacker/confirm", "https://attacker.test/?confirmation=1", "invalid"]) expect(isConfirmationUrl(value)).toBe(false);
});
it("checks the issuer without adopting, refreshing or persisting a link session", async () => {
  await verifyEmailConfirmation(url);
  expect(mockGetUser).toHaveBeenCalledWith("synthetic-access");
  expect(createClient).toHaveBeenCalledWith("https://qa.invalid", "public-test", expect.objectContaining({ auth: expect.objectContaining({ persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }) }));
});
it("rejects recovery, missing tokens and explicit errors before calling the server", async () => {
  for (const value of [url.replace("type=signup", "type=recovery"), "nilaza://auth/confirm#type=signup", url + "&error=expired", url.replace("/confirm", "/recovery")]) await expect(verifyEmailConfirmation(value)).rejects.toThrow("link");
  expect(mockGetUser).not.toHaveBeenCalled();
});
it("cannot report success for an unconfirmed or expired server user", async () => {
  mockGetUser.mockResolvedValueOnce({ data: { user: { email_confirmed_at: null } }, error: null });
  await expect(verifyEmailConfirmation(url)).rejects.toThrow("link");
  mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("expired") });
  await expect(verifyEmailConfirmation(url)).rejects.toThrow("link");
});
it("web callbacks keep the current origin/path and reject external origins or mixed recovery", () => {
  const originalOS = Platform.OS;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "https://app.example.test", pathname: "/review" } } });
  try {
    expect(confirmationRedirectUrl()).toBe("https://app.example.test/review?confirmation=1");
    expect(isConfirmationUrl(confirmationRedirectUrl())).toBe(true);
    for (const value of ["https://attacker.test/review?confirmation=1", "https://app.example.test/other?confirmation=1", "https://app.example.test/review?confirmation=1&recovery=1"]) expect(isConfirmationUrl(value)).toBe(false);
  } finally {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
