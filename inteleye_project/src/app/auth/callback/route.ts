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

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeNext(request.nextUrl.searchParams.get("next"));

  if (!code) {
    return authErrorRedirect(request, "missing_code");
  }

  const supabase = createSupabaseServerClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return authErrorRedirect(request, "invalid_code");
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
