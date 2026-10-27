import { scrollBandFor } from "../scrollThresholds";

it("keeps the same band while scrolling between thresholds", () => {
  expect([0, 120, 170].map(scrollBandFor)).toEqual([0, 0, 0]);
  expect([171, 200, 220].map(scrollBandFor)).toEqual([1, 1, 1]);
  expect([221, 900, 5000].map(scrollBandFor)).toEqual([2, 2, 2]);
});
