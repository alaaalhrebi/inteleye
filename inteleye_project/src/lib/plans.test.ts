import assert from "node:assert/strict";
import test from "node:test";

import { getCheckoutQuote, normalizePlan } from "./plans";

test("يوحد أسماء الخطط ويرفض القيم غير المعروفة", () => {
  assert.equal(normalizePlan(" PRO "), "pro");
  assert.equal(normalizePlan("enterprise"), "enterprise");
  assert.equal(normalizePlan("unknown"), "basic");
});

test("العميل غير المدفوع يدفع كامل سعر الخطة المختارة", () => {
  assert.deepEqual(
    getCheckoutQuote({
      currentPlan: "basic",
      targetPlan: "pro",
      hasActiveSubscription: false,
    }),
    { mode: "subscription", amountHalalas: 49_900 }
  );
});

test("عميل Basic النشط يدفع فرق Pro فقط", () => {
  assert.deepEqual(
    getCheckoutQuote({
      currentPlan: "basic",
      targetPlan: "pro",
      hasActiveSubscription: true,
    }),
    { mode: "upgrade", amountHalalas: 30_000 }
  );
});

test("عميل Pro النشط يدفع فرق Enterprise فقط", () => {
  assert.deepEqual(
    getCheckoutQuote({
      currentPlan: "pro",
      targetPlan: "enterprise",
      hasActiveSubscription: true,
    }),
    { mode: "upgrade", amountHalalas: 50_000 }
  );
});

test("يمنع شراء الباقة الحالية أو التخفيض من صفحة الترقية", () => {
  assert.equal(
    getCheckoutQuote({
      currentPlan: "pro",
      targetPlan: "pro",
      hasActiveSubscription: true,
    }).mode,
    "current"
  );
  assert.equal(
    getCheckoutQuote({
      currentPlan: "enterprise",
      targetPlan: "basic",
      hasActiveSubscription: true,
    }).mode,
    "downgrade"
  );
});
