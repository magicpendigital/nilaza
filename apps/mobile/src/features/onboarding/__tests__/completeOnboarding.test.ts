import { persistOnboarding } from "../completeOnboarding";
import type { Profile } from "../../../types";
const profile: Profile = { onboarded: false, nickname: "An", language: "vi", goals: [], tone: "wise", currentStreak: 3, lastActivityDate: "2026-09-10" };
it("skipping preserves the account name, empty goals, chosen tone and history", async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  expect(await persistOnboarding(profile, save, () => true)).toEqual({ ...profile, onboarded: true });
  expect(profile.onboarded).toBe(false);
});
it("a failed write cannot report completion and remains retryable", async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error("disk full")).mockResolvedValueOnce(undefined);
  await expect(persistOnboarding(profile, save, () => true)).rejects.toThrow("disk full");
  expect(profile.onboarded).toBe(false);
  expect((await persistOnboarding(profile, save, () => true)).onboarded).toBe(true);
});
it("does not publish completion into a newly switched account", async () => {
  let active = true;
  await expect(persistOnboarding(profile, async () => { active = false; }, () => active)).rejects.toThrow("Account changed");
});
