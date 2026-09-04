import assert from "node:assert/strict";
import test from "node:test";

import {
  PlatformSyncWebhookError,
  getPlatformSyncWebhookUrl,
  queuePlatformSync,
} from "./n8n";

const environment = {
  N8N_REPORT_WEBHOOK_URL: "https://example.app.n8n.cloud/webhook/report-on-demand",
  N8N_REPORT_WEBHOOK_SECRET: "secret",
};

test("يبني رابط المزامنة من نطاق Webhook التقارير", () => {
  assert.equal(
    getPlatformSyncWebhookUrl("tiktok", environment),
    "https://example.app.n8n.cloud/webhook/platform-sync-tiktok"
  );
});

test("يفضل رابط Webhook الأساسي المخصص عند وجوده", () => {
  assert.equal(
    getPlatformSyncWebhookUrl("instagram", {
      ...environment,
      N8N_PLATFORM_SYNC_WEBHOOK_BASE_URL:
        "https://hooks.example.com/n8n/webhook/",
    }),
    "https://hooks.example.com/n8n/webhook/platform-sync-instagram"
  );
});

test("يرسل معرف المنصة ونوعها فقط مع Header المصادقة", async () => {
  let receivedUrl = "";
  let receivedBody = "";
  let receivedSecret = "";

  await queuePlatformSync(
    { platformId: 42, platformName: "google_maps" },
    {
      environment,
      fetchImpl: async (url, init) => {
        receivedUrl = String(url);
        receivedBody = String(init?.body);
        receivedSecret = new Headers(init?.headers).get("Authorization") || "";
        return new Response(null, { status: 200 });
      },
    }
  );

  assert.equal(
    receivedUrl,
    "https://example.app.n8n.cloud/webhook/platform-sync-google_maps"
  );
  assert.deepEqual(JSON.parse(receivedBody), {
    platform_id: 42,
    platform_name: "google_maps",
  });
  assert.equal(receivedSecret, "secret");
});

test("لا يقبل عنوان Webhook غير آمن", () => {
  assert.throws(
    () =>
      getPlatformSyncWebhookUrl("x", {
        N8N_PLATFORM_SYNC_WEBHOOK_BASE_URL: "http://hooks.example.com/webhook",
      }),
    (error: unknown) =>
      error instanceof PlatformSyncWebhookError &&
      error.code === "INVALID_WEBHOOK_URL"
  );
});

test("يعيد خطأ آمن إذا كان Webhook غير منشور", async () => {
  await assert.rejects(
    queuePlatformSync(
      { platformId: 9, platformName: "tiktok" },
      {
        environment,
        fetchImpl: async () => new Response(null, { status: 404 }),
      }
    ),
    (error: unknown) =>
      error instanceof PlatformSyncWebhookError &&
      error.code === "WEBHOOK_INACTIVE"
  );
});
