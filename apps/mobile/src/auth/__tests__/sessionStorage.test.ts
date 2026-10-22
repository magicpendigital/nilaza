import { sessionStorageKey } from "../sessionStorage";
import type { LocalAuthState } from "../../types";

const guest: LocalAuthState = {
  version: 2,
  status: "guest",
  guestId: "Guest 01",
  createdAt: "2026-09-01T08:00:00.000Z",
  onboarding: { completed: false, step: 0, language: "vi", goals: [], tone: "gentle" }
};

describe("session storage namespace", () => {
  it("separates private account data by user id", () => {
    const first: LocalAuthState = { version: 2, status: "signed_in", user: { id: "user-a", name: "A", email: "a@example.com", provider: "email" } };
    const second: LocalAuthState = { version: 2, status: "signed_in", user: { id: "user-b", name: "B", email: "b@example.com", provider: "email" } };
    expect(sessionStorageKey(first, "journal")).toBe("nilaza.user.user-a.journal");
    expect(sessionStorageKey(second, "journal")).toBe("nilaza.user.user-b.journal");
  });

  it("persists only guest preferences and never private guest content", () => {
    expect(sessionStorageKey(guest, "selectedDeckId", "preference")).toBe("nilaza.guest.guest%2001.selectedDeckId");
    expect(sessionStorageKey(guest, "journal", "private")).toBeNull();
  });

  it("does not persist session content while signed out", () => {
    expect(sessionStorageKey({ version: 2, status: "signed_out" }, "profile", "preference")).toBeNull();
  });
});
