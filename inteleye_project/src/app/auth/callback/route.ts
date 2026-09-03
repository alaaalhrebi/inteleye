import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizePlan } from "@/lib/plans";

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

function getCallbackParams(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  let tokenHash = request.nextUrl.searchParams.get("token_hash");
  let nextValue = request.nextUrl.searchParams.get("next");

  // توافق مع رسائل التأكيد التي أُرسلت عندما كان RedirectTo يحتوي على
  // ?next=... ثم أضاف القالب ?token_hash=... بعلامة استفهام ثانية.
  // لا يتم تسجيل token_hash أو إعادته ضمن أي رسالة خطأ.
  if (!tokenHash && type === "signup" && nextValue) {
    const nestedTokenMarker = "?token_hash=";
    const nestedTokenIndex = nextValue.lastIndexOf(nestedTokenMarker);

    if (nestedTokenIndex > 0) {
      const nestedParams = new URLSearchParams(
        nextValue.slice(nestedTokenIndex + 1)
      );
      tokenHash = nestedParams.get("token_hash");
      nextValue = nextValue.slice(0, nestedTokenIndex);
    }
  }

  return {
    tokenHash,
    type,
    code: request.nextUrl.searchParams.get("code"),
    next: nextValue ? getSafeNext(nextValue) : null,
  };
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
  const { tokenHash, type, code, next } = getCallbackParams(request);
  const supabase = createSupabaseServerClient();
  let isSignupVerification = false;

  if (tokenHash) {
    if (type !== "signup") {
      return authErrorRedirect(request, "invalid_type");
    }

    isSignupVerification = true;

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

  const destination =
    next ??
    (isSignupVerification
      ? user.user_metadata?.signup_intent === "trial"
        ? DEFAULT_REDIRECT
        : `/checkout?plan=${normalizePlan(user.user_metadata?.selected_plan)}`
      : DEFAULT_REDIRECT);

  return NextResponse.redirect(new URL(destination, request.url));
}
