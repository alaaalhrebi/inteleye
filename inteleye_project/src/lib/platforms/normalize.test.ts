import assert from "node:assert/strict";
import test from "node:test";

import { normalizePlatformValue } from "./normalize";

test("يوحد اسم مستخدم X", async () => {
  assert.deepEqual(await normalizePlatformValue("x", "@inteleye"), {
    platformUrl: "https://x.com/inteleye",
    username: "inteleye",
  });
});

test("يقبل رابط Google Maps المباشر دون طلب شبكة", async () => {
  let called = false;
  const fetchImpl = (async () => {
    called = true;
    throw new Error("unexpected request");
  }) as typeof fetch;

  assert.deepEqual(
    await normalizePlatformValue(
      "google_maps",
      "https://www.google.com/maps/place/IntelEye/#details",
      fetchImpl
    ),
    {
      platformUrl: "https://www.google.com/maps/place/IntelEye",
      username: null,
    }
  );
  assert.equal(called, false);
});

test("يوسع رابط Google Maps المختصر قبل حفظه", async () => {
  const fetchImpl = (async () =>
    ({
      url: "https://www.google.com/maps/place/IntelEye/",
      body: null,
    }) as Response) as typeof fetch;

  assert.deepEqual(
    await normalizePlatformValue(
      "google_maps",
      "https://share.google/example",
      fetchImpl
    ),
    {
      platformUrl: "https://www.google.com/maps/place/IntelEye",
      username: null,
    }
  );
});

test("يرفض روابط Google Maps المختصرة التي لا تنتهي في نطاق الخرائط", async () => {
  const fetchImpl = (async () =>
    ({ url: "https://example.com/not-maps", body: null }) as Response) as typeof fetch;

  assert.equal(
    await normalizePlatformValue(
      "google_maps",
      "https://share.google/example",
      fetchImpl
    ),
    null
  );
});
