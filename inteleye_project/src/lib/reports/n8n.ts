import type { ReportRequestPayload } from "@/lib/reports/types";

type LegacyWorkflowInput = Omit<
  ReportRequestPayload,
  "branchId"
> & {
  branchId: number | null;
  clientId: number;
  requestedBy: string;
};

type WorkflowEnvironment = {
  N8N_REPORT_WEBHOOK_URL?: string;
  N8N_REPORT_WEBHOOK_SECRET?: string;
  N8N_REPORT_WEBHOOK_AUTH_HEADER?: string;
};

type SendOptions = {
  fetchImpl?: typeof fetch;
  environment?: WorkflowEnvironment;
  timeoutMs?: number;
};

export class ReportWorkflowError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ReportWorkflowError";
  }
}

export function buildLegacyWorkflowPayload(input: LegacyWorkflowInput) {
  if (input.reportType !== "custom" || input.platformIds.length !== 1) {
    throw new ReportWorkflowError(
      "UNSUPPORTED_WORKFLOW_INPUT",
      422,
      "خدمة التقارير الحالية تدعم تقريرًا مخصصًا لمنصة واحدة فقط"
    );
  }

  return {
    client_id: input.clientId,
    requested_by: input.requestedBy,
    branch_id: input.branchId,
    platform_id: input.platformIds[0],
    period_start: input.periodStart,
    period_end: input.periodEnd,
  };
}

export async function requestReportFromWorkflow(
  input: LegacyWorkflowInput,
  options: SendOptions = {}
) {
  const environment = options.environment ?? process.env;
  const webhookUrl = environment.N8N_REPORT_WEBHOOK_URL?.trim();
  const webhookSecret = environment.N8N_REPORT_WEBHOOK_SECRET?.trim();
  const authHeaderName =
    environment.N8N_REPORT_WEBHOOK_AUTH_HEADER?.trim() || "Authorization";

  if (!webhookUrl || !webhookSecret) {
    throw new ReportWorkflowError(
      "WORKFLOW_NOT_CONFIGURED",
      503,
      "خدمة إنشاء التقارير غير مفعلة حالياً."
    );
  }
  if (!/^[A-Za-z0-9-]+$/.test(authHeaderName)) {
    throw new ReportWorkflowError(
      "INVALID_AUTH_HEADER",
      503,
      "إعداد مصادقة خدمة التقارير غير صالح"
    );
  }

  const payload = buildLegacyWorkflowPayload(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);

  try {
    const response = await (options.fetchImpl ?? fetch)(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [authHeaderName]: webhookSecret,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    let data: Record<string, unknown> = {};
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      // لا نمرر استجابة n8n الخام للمستخدم.
    }

    if (response.status !== 202) {
      const isAuthenticationFailure =
        response.status === 401 || response.status === 403;
      const isInactiveWorkflow = response.status === 404;
      throw new ReportWorkflowError(
        isAuthenticationFailure
          ? "WORKFLOW_AUTH_FAILED"
          : isInactiveWorkflow
            ? "WORKFLOW_INACTIVE"
            : "WORKFLOW_REJECTED",
        isAuthenticationFailure || isInactiveWorkflow || response.status >= 500
          ? 503
          : response.status,
        isInactiveWorkflow
          ? "خدمة إنشاء التقارير غير مفعلة حالياً."
          : "تعذر إرسال طلب التقرير. يرجى المحاولة لاحقاً."
      );
    }

    const requestId = data.request_id;
    if (
      (typeof requestId !== "string" && typeof requestId !== "number") ||
      String(requestId).trim() === ""
    ) {
      throw new ReportWorkflowError(
        "INVALID_WORKFLOW_RESPONSE",
        502,
        "أرسلت خدمة التقارير استجابة غير مكتملة"
      );
    }

    return { requestId: String(requestId), status: "processing" as const };
  } catch (error) {
    if (error instanceof ReportWorkflowError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ReportWorkflowError(
        "WORKFLOW_TIMEOUT",
        504,
        "تأخرت خدمة التقارير في الاستجابة، حاول مرة أخرى لاحقًا"
      );
    }
    throw new ReportWorkflowError(
      "WORKFLOW_UNAVAILABLE",
      503,
      "تعذر إرسال طلب التقرير. يرجى المحاولة لاحقاً."
    );
  } finally {
    clearTimeout(timeout);
  }
}
