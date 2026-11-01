import { localizePulseSign } from "../localizePulseSign";

test("the English sign name from the server is shown in Vietnamese", () => {
  const pulse = localizePulseSign({ sign: "Capricorn", title: "Capricorn hôm nay", reflection: "Với Capricorn như một điểm bắt đầu biểu tượng, hôm nay hãy nghỉ một nhịp." }, "vi");
  expect(pulse.sign).toBe("Ma Kết");
  expect(pulse.signId).toBe("capricorn");
  expect(pulse.title).toBe("Ma Kết hôm nay");
  expect(pulse.reflection).toContain("Với Ma Kết như");
  expect(pulse.reflection).not.toContain("Capricorn");
});

test("unknown or missing signs are left as they are", () => {
  const pulse = { sign: undefined, title: "Daily Zodiac Pulse" };
  expect(localizePulseSign(pulse, "vi")).toBe(pulse);
});
