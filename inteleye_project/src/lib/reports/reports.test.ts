import assert from "node:assert/strict";
import test from "node:test";

import { getSubscriptionPermissions } from "../subscription-permissions";
import {
  ReportWorkflowError,
  buildLegacyWorkflowPayload,
  requestReportFromWorkflow,
} from "./n8n";
import { validateReportRequest } from "./request-validation";

const now = new Date("2026-08-02T12:00:00Z");
const validBody = {
  branchId: 10,
  platformIds: [3],
  reportType: "custom",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
};

test("trial السارية تصل إلى لوحة التحكم ولا تصل إلى التقارير", () => {
  const value = getSubscriptionPermissions(
    { subscription_status: "trial", trial_ends_at: "2026-08-03T00:00:00Z" },
    { now }
  );
  assert.equal(value.canAccessDashboard, true);
  assert.equal(value.canViewReports, false);
  assert.equal(value.canCreateCustomReport, false);
});

test("trial المنتهية لا تصل إلى لوحة التحكم أو التقارير", () => {
  const value = getSubscriptionPermissions(
    { subscription_status: "trial", trial_ends_at: "2026-08-01T00:00:00Z" },
    { now }
  );
  assert.equal(value.canAccessDashboard, false);
  assert.equal(value.canViewReports, false);
});

test("Basic السارية تعرض التقارير ولا تنشئ تقريرًا مخصصًا", () => {
  const value = getSubscriptionPermissions(
    { subscription_status: "active", plan: "basic" },
    { now }
  );
  assert.equal(value.canViewReports, true);
  assert.equal(value.canCreateCustomReport, false);
});

test("Pro السارية تعرض وتنشئ تقريرًا مخصصًا", () => {
  const value = getSubscriptionPermissions(
    { subscription_status: "active", plan: "pro" },
    { now }
  );
  assert.equal(value.canViewReports, true);
  assert.equal(value.canCreateCustomReport, true);
});

test("Enterprise السارية تعرض وتنشئ تقريرًا مخصصًا", () => {
  const value = getSubscriptionPermissions(
    { subscription_status: "active", plan: "enterprise" },
    { now }
  );
  assert.equal(value.canViewReports, true);
  assert.equal(value.canCreateCustomReport, true);
});

test("الاشتراك المدفوع المنتهي لا يصل إلى التقارير", () => {
  const value = getSubscriptionPermissions(
    {
      subscription_status: "active",
      plan: "pro",
      current_period_end: "2026-08-01T00:00:00Z",
    },
    { now }
  );
  assert.equal(value.canViewReports, false);
});

test("يقبل طلبًا صحيحًا لمنصة واحدة", () => {
  assert.equal(validateReportRequest(validBody, now).ok, true);
});

test("يرفض branch_id المفقود", () => {
  assert.equal(validateReportRequest({ ...validBody, branchId: undefined }, now).ok, false);
});

test("يرفض branch_id غير الموجب", () => {
  assert.equal(validateReportRequest({ ...validBody, branchId: 0 }, now).ok, false);
});

test("يرفض platform_id غير الصحيح", () => {
  assert.equal(validateReportRequest({ ...validBody, platformIds: [0] }, now).ok, false);
});

test("يرفض طلبًا بدون منصة", () => {
  assert.equal(validateReportRequest({ ...validBody, platformIds: [] }, now).ok, false);
});

test("يرفض أكثر من منصة", () => {
  const result = validateReportRequest({ ...validBody, platformIds: [3, 4] }, now);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 422);
});

test("يرفض تقرير المقارنة غير المدعوم", () => {
  const result = validateReportRequest({ ...validBody, reportType: "comparison" }, now);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 422);
});

test("يرفض اسم التقرير بدل تجاهله بصمت", () => {
  const result = validateReportRequest({ ...validBody, reportName: "يوليو" }, now);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /غير مدعوم/);
});

test("يرفض تاريخًا غير موجود", () => {
  assert.equal(validateReportRequest({ ...validBody, periodEnd: "2026-02-31" }, now).ok, false);
});

test("يرفض بداية بعد النهاية", () => {
  assert.equal(
    validateReportRequest({ ...validBody, periodStart: "2026-08-01", periodEnd: "2026-07-01" }, now).ok,
    false
  );
});

test("يرفض تاريخ بداية مستقبلي", () => {
  assert.equal(
    validateReportRequest({ ...validBody, periodStart: "2026-08-03", periodEnd: "2026-08-03" }, now).ok,
    false
  );
});

test("يرفض تاريخ نهاية مستقبلي", () => {
  assert.equal(validateReportRequest({ ...validBody, periodEnd: "2026-08-03" }, now).ok, false);
});

test("يرفض فترة تتجاوز سنة", () => {
  assert.equal(
    validateReportRequest({ ...validBody, periodStart: "2025-07-01", periodEnd: "2026-07-02" }, now).ok,
    false
  );
});

test("يبني payload القديم بالحقول الستة فقط", () => {
  assert.deepEqual(
    buildLegacyWorkflowPayload({
      ...validBody,
      reportType: "custom",
      clientId: 1,
      requestedBy: "USER_UUID",
    }),
    {
      client_id: 1,
      requested_by: "USER_UUID",
      branch_id: 10,
      platform_id: 3,
      period_start: "2026-07-01",
      period_end: "2026-07-31",
    }
  );
});

test("يتعامل مع 202 وrequest_id بنجاح دون إضافة Bearer", async () => {
  let receivedHeaders: Headers | undefined;
  const result = await requestReportFromWorkflow(
    { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
    {
      environment: {
        N8N_REPORT_WEBHOOK_URL: "https://n8n.example/webhook/report-on-demand",
        N8N_REPORT_WEBHOOK_SECRET: "raw-secret-value",
      },
      fetchImpl: async (_url, init) => {
        receivedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify({ request_id: "req-1" }), { status: 202 });
      },
    }
  );
  assert.equal(result.requestId, "req-1");
  assert.equal(receivedHeaders?.get("Authorization"), "raw-secret-value");
});

test("يدعم اسم Header الفعلي من الإعداد دون افتراضه", async () => {
  let header = "";
  await requestReportFromWorkflow(
    { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
    {
      environment: {
        N8N_REPORT_WEBHOOK_URL: "https://n8n.example/webhook/report-on-demand",
        N8N_REPORT_WEBHOOK_SECRET: "secret",
        N8N_REPORT_WEBHOOK_AUTH_HEADER: "X-Webhook-Secret",
      },
      fetchImpl: async (_url, init) => {
        header = new Headers(init?.headers).get("X-Webhook-Secret") || "";
        return new Response(JSON.stringify({ request_id: 2 }), { status: 202 });
      },
    }
  );
  assert.equal(header, "secret");
});

test("يعيد خطأ إعداد واضح عند غياب رابط n8n", async () => {
  await assert.rejects(
    requestReportFromWorkflow(
      { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
      { environment: {} }
    ),
    (error: unknown) => error instanceof ReportWorkflowError && error.code === "WORKFLOW_NOT_CONFIGURED"
  );
});

test("يعيد خطأ إعداد واضح عند غياب سر n8n", async () => {
  await assert.rejects(
    requestReportFromWorkflow(
      { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
      { environment: { N8N_REPORT_WEBHOOK_URL: "https://n8n.example" } }
    ),
    (error: unknown) => error instanceof ReportWorkflowError && error.code === "WORKFLOW_NOT_CONFIGURED"
  );
});

test("يعالج فشل Header Auth برسالة آمنة", async () => {
  await assert.rejects(
    requestReportFromWorkflow(
      { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
      {
        environment: { N8N_REPORT_WEBHOOK_URL: "https://n8n.example", N8N_REPORT_WEBHOOK_SECRET: "wrong" },
        fetchImpl: async () => new Response("", { status: 403 }),
      }
    ),
    (error: unknown) => error instanceof ReportWorkflowError && error.code === "WORKFLOW_AUTH_FAILED"
  );
});

test("يعالج Workflow غير النشط أو المفقود", async () => {
  await assert.rejects(
    requestReportFromWorkflow(
      { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
      {
        environment: { N8N_REPORT_WEBHOOK_URL: "https://n8n.example", N8N_REPORT_WEBHOOK_SECRET: "secret" },
        fetchImpl: async () => new Response("", { status: 404 }),
      }
    ),
    (error: unknown) => error instanceof ReportWorkflowError && error.code === "WORKFLOW_INACTIVE"
  );
});

test("يعالج رفض n8n للطلب بحالة 400", async () => {
  await assert.rejects(
    requestReportFromWorkflow(
      { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
      {
        environment: { N8N_REPORT_WEBHOOK_URL: "https://n8n.example", N8N_REPORT_WEBHOOK_SECRET: "secret" },
        fetchImpl: async () => new Response("", { status: 400 }),
      }
    ),
    (error: unknown) =>
      error instanceof ReportWorkflowError &&
      error.code === "WORKFLOW_REJECTED" &&
      error.status === 400
  );
});

test("يعالج فشل n8n بحالة 500 كخدمة غير متاحة", async () => {
  await assert.rejects(
    requestReportFromWorkflow(
      { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
      {
        environment: { N8N_REPORT_WEBHOOK_URL: "https://n8n.example", N8N_REPORT_WEBHOOK_SECRET: "secret" },
        fetchImpl: async () => new Response("", { status: 500 }),
      }
    ),
    (error: unknown) => error instanceof ReportWorkflowError && error.status === 503
  );
});

test("يعالج timeout دون كشف بيانات الطلب", async () => {
  await assert.rejects(
    requestReportFromWorkflow(
      { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
      {
        environment: { N8N_REPORT_WEBHOOK_URL: "https://n8n.example", N8N_REPORT_WEBHOOK_SECRET: "secret" },
        fetchImpl: async () => {
          const error = new Error("timeout");
          error.name = "AbortError";
          throw error;
        },
      }
    ),
    (error: unknown) => error instanceof ReportWorkflowError && error.code === "WORKFLOW_TIMEOUT"
  );
});

test("يرفض استجابة 202 دون request_id", async () => {
  await assert.rejects(
    requestReportFromWorkflow(
      { ...validBody, reportType: "custom", clientId: 1, requestedBy: "USER_UUID" },
      {
        environment: { N8N_REPORT_WEBHOOK_URL: "https://n8n.example", N8N_REPORT_WEBHOOK_SECRET: "secret" },
        fetchImpl: async () => new Response("{}", { status: 202 }),
      }
    ),
    (error: unknown) => error instanceof ReportWorkflowError && error.code === "INVALID_WORKFLOW_RESPONSE"
  );
});
