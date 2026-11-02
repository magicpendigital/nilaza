import { adminRoleLabel } from "../access";

test("the Owner hub names admin roles in Vietnamese and keeps unknown codes (analysis PR-07)", () => {
  expect(["owner", "safety_reviewer"].map(adminRoleLabel)).toEqual(["Chủ sở hữu", "Người duyệt an toàn"]);
  expect(adminRoleLabel("future_role")).toBe("future_role");
});
