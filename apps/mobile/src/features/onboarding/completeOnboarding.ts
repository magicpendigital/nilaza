import type { Profile } from "../../types";

export async function persistOnboarding(profile: Profile, save: (profile: Profile) => Promise<void>, isActive: () => boolean) {
  if (!isActive()) throw new Error("Account is no longer active");
  const next = { ...profile, onboarded: true };
  await save(next);
  if (!isActive()) throw new Error("Account changed during save");
  return next;
}
