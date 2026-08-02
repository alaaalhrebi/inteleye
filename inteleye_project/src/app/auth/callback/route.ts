import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const DEFAULT_REDIRECT = "/dashboard";

function getSafeNext(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.startsWith("/auth/callback")
  ) {
    return DEFAULT_REDIRECT;
  }

  return value;
}

function authErrorRedirect(request: NextRequest, reason: string) {
  const errorUrl = new URL("/auth/error", request.url);
  errorUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(errorUrl);
}

function getPkceErrorReason(errorCode?: string) {
  if (errorCode === "pkce_code_verifier_not_found") {
    return "pkce_verifier_missing";
  }

  if (errorCode === "bad_code_verifier") {
    return "pkce_verifier_mismatch";
  }

  if (
    errorCode === "flow_state_not_found" ||
    errorCode === "flow_state_expired" ||
    errorCode === "otp_expired"
  ) {
    return "pkce_expired";
  }

  return "pkce_exchange_failed";
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeNext(request.nextUrl.searchParams.get("next"));
  const supabase = createSupabaseServerClient();

  if (tokenHash) {
    if (type !== "signup") {
      return authErrorRedirect(request, "invalid_type");
    }

    const { error: verificationError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "signup",
    });

    if (verificationError) {
      return authErrorRedirect(request, "invalid_token");
    }
  } else if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return authErrorRedirect(
        request,
        getPkceErrorReason(exchangeError.code)
      );
    }
  } else {
    return authErrorRedirect(request, "missing_token");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return authErrorRedirect(request, "no_session");
  }

  return NextResponse.redirect(new URL(next, request.url));
}
