import { homeNextStep, homeNextStepCopy } from "../nextStep";

const base = { revealed: true, wroteToday: true, reminderOn: true, reminderSupported: true };

test("Home suggests one next step in order: reveal, write, reminder (analysis HO-05)", () => {
  expect(homeNextStep({ ...base, revealed: false, wroteToday: false, reminderOn: false })).toBe("reveal");
  expect(homeNextStep({ ...base, wroteToday: false, reminderOn: false })).toBe("write");
  expect(homeNextStep({ ...base, reminderOn: false })).toBe("reminder");
  expect(homeNextStep(base)).toBeNull();
});

test("the reminder step is skipped where reminders cannot be scheduled", () => {
  expect(homeNextStep({ ...base, reminderOn: false, reminderSupported: false })).toBeNull();
  expect(homeNextStepCopy("write", "vi").cta).toBe("Viết ngay");
});
