import {
  createEmailAuthState,
  createGuestAuthState,
  displayNameFromEmail,
  isValidEmail,
  isValidPassword,
  resolveInitialAuthState,
  signedOutAuthState
} from "../localAuth";
import { Profile } from "../../types";

const freshProfile: Profile = {
  onboarded: false,
  nickname: "Luna",
  language: "vi",
  goals: [],
  tone: "gentle"
};

describe("local auth helpers", () => {
  it("validates email and password inputs", () => {
    expect(isValidEmail(" seeker@example.com ")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("short")).toBe(false);
  });

  it("normalizes a local email session without storing a password", () => {
    expect(createEmailAuthState(" Luna ", " LUNA@EXAMPLE.COM ")).toEqual({
      version: 2,
      status: "signed_in",
      user: {
        id: "local-luna@example.com",
        name: "Luna",
        email: "luna@example.com",
        provider: "email"
      }
    });
  });

  it("builds a readable fallback name from an email", () => {
    expect(displayNameFromEmail("celestial.wanderer@example.com")).toBe("Celestial Wanderer");
  });

  it("keeps fresh users signed out and migrates onboarded legacy profiles", () => {
    expect(resolveInitialAuthState(null, freshProfile)).toEqual(signedOutAuthState);
    expect(resolveInitialAuthState(null, { ...freshProfile, onboarded: true, nickname: "Mai" })).toEqual({
      version: 2,
      status: "signed_in",
      user: {
        id: "legacy-local",
        name: "Mai",
        email: "",
        provider: "legacy-local"
      }
    });
  });

  it("respects an explicit signed-out state for returning profiles", () => {
    expect(resolveInitialAuthState(signedOutAuthState, { ...freshProfile, onboarded: true })).toEqual(signedOutAuthState);
  });

  it("creates a versioned guest session without personal data", () => {
    const guest = createGuestAuthState(new Date("2026-09-01T08:00:00.000Z"));
    expect(guest).toEqual(expect.objectContaining({
      version: 2,
      status: "guest",
      createdAt: "2026-09-01T08:00:00.000Z"
    }));
    if (guest.status === "guest") {
      expect(guest.guestId).toMatch(/^guest-\d+-[a-z0-9]+$/);
      expect(guest).not.toHaveProperty("user");
    }
  });

  it("migrates a stored v1 signed-in session to v2", () => {
    expect(resolveInitialAuthState({
      version: 1,
      status: "signed_in",
      user: {
        id: "legacy-user",
        name: "Mai",
        email: "mai@example.com",
        provider: "email"
      }
    }, freshProfile)).toEqual({
      version: 2,
      status: "signed_in",
      user: {
        id: "legacy-user",
        name: "Mai",
        email: "mai@example.com",
        provider: "email"
      }
    });
  });
});
