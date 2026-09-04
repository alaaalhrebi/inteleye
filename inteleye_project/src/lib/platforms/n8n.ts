export const SYNC_PLATFORM_NAMES = [
  "google_maps",
  "x",
  "tiktok",
  "instagram",
] as const;

export type SyncPlatformName = (typeof SYNC_PLATFORM_NAMES)[number];

type PlatformSyncEnvironment = {
  N8N_REPORT_WEBHOOK_URL?: string;
  N8N_REPORT_WEBHOOK_SECRET?: string;
  N8N_REPORT_WEBHOOK_AUTH_HEADER?: string;
  N8N_PLATFORM_SYNC_WEBHOOK_BASE_URL?: string;
};

type QueuePlatformSyncOptions = {
  environment?: PlatformSyncEnvironment;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export class PlatformSyncWebhookError extends Error {
  public code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = "PlatformSyncWebhookError";
  }
}

export function getPlatformSyncWebhookUrl(
  platformName: SyncPlatformName,
  environment: PlatformSyncEnvironment
) {
  const configuredBase = environment.N8N_PLATFORM_SYNC_WEBHOOK_BASE_URL?.trim();
  const reportWebhookUrl = environment.N8N_REPORT_WEBHOOK_URL?.trim();

  let baseUrl = configuredBase;
  if (!baseUrl && reportWebhookUrl) {
    try {
      baseUrl = `${new URL(reportWebhookUrl).origin}/webhook`;
    } catch {
      throw new PlatformSyncWebhookError("INVALID_WEBHOOK_URL");
    }
  }

  if (!baseUrl) {
    throw new PlatformSyncWebhookError("WEBHOOK_NOT_CONFIGURED");
  }

  try {
    const url = new URL(
      `platform-sync-${platformName}`,
      `${baseUrl.replace(/\/+$/, "")}/`
    );

    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new PlatformSyncWebhookError("INVALID_WEBHOOK_URL");
    }

    return url.toString();
  } catch (error) {
    if (error instanceof PlatformSyncWebhookError) throw error;
    throw new PlatformSyncWebhookError("INVALID_WEBHOOK_URL");
  }
}

export async function queuePlatformSync(
  input: { platformId: number; platformName: SyncPlatformName },
  options: QueuePlatformSyncOptions = {}
) {
  const environment: PlatformSyncEnvironment = options.environment ?? {
    N8N_REPORT_WEBHOOK_URL: process.env.N8N_REPORT_WEBHOOK_URL,
    N8N_REPORT_WEBHOOK_SECRET: process.env.N8N_REPORT_WEBHOOK_SECRET,
    N8N_REPORT_WEBHOOK_AUTH_HEADER:
      process.env.N8N_REPORT_WEBHOOK_AUTH_HEADER,
    N8N_PLATFORM_SYNC_WEBHOOK_BASE_URL:
      process.env.N8N_PLATFORM_SYNC_WEBHOOK_BASE_URL,
  };
  const webhookSecret = environment.N8N_REPORT_WEBHOOK_SECRET?.trim();
  const authHeaderName =
    environment.N8N_REPORT_WEBHOOK_AUTH_HEADER?.trim() || "Authorization";

  if (!webhookSecret) {
    throw new PlatformSyncWebhookError("WEBHOOK_NOT_CONFIGURED");
  }
  if (!/^[A-Za-z0-9-]+$/.test(authHeaderName)) {
    throw new PlatformSyncWebhookError("INVALID_AUTH_HEADER");
  }

  const webhookUrl = getPlatformSyncWebhookUrl(input.platformName, environment);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);

  try {
    const response = await (options.fetchImpl ?? fetch)(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [authHeaderName]: webhookSecret,
      },
      body: JSON.stringify({
        platform_id: input.platformId,
        platform_name: input.platformName,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new PlatformSyncWebhookError(
        response.status === 401 || response.status === 403
          ? "WEBHOOK_AUTH_FAILED"
          : response.status === 404
            ? "WEBHOOK_INACTIVE"
            : "WEBHOOK_REJECTED"
      );
    }
  } catch (error) {
    if (error instanceof PlatformSyncWebhookError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PlatformSyncWebhookError("WEBHOOK_TIMEOUT");
    }
    throw new PlatformSyncWebhookError("WEBHOOK_UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}
