import assert from "node:assert/strict";
import test from "node:test";
import { subscriptionWriteError } from "./subscription-write-errors";

for (const message of ["branch_plan_limit_reached", "platform_link_limit_reached", "platform_type_limit_reached", "platform_branch_client_mismatch"]) {
  test(`maps ${message} to a safe Arabic denial`, () => {
    const result = subscriptionWriteError({ code: "23514", message });
    assert.equal(result?.status, 403);
    assert.ok(result?.message && !result.message.includes(message));
  });
}
for (const code of ["40001", "40P01"]) {
  test(`maps concurrent failure ${code} to retryable conflict`, () => {
    assert.equal(subscriptionWriteError({ code, message: "private details" })?.status, 409);
  });
}
test("leaves existing unrelated error handling intact", () => {
  assert.equal(subscriptionWriteError({ code: "23505", message: "duplicate" }), null);
  assert.equal(subscriptionWriteError(null), null);
});
