import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_REQUEST_TIMEOUT_MS = 5_000;

async function fetchWithAuthTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    AUTH_REQUEST_TIMEOUT_MS
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );

          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value)
          );
        },
      },
      global: {
        fetch: fetchWithAuthTimeout,
      },
    }
  );

  const path = request.nextUrl.pathname;

  const protectedPaths = ["/dashboard", "/onboarding", "/checkout"];
  const isProtectedPath = protectedPaths.some((protectedPath) =>
    path.startsWith(protectedPath)
  );

  let hasAuthenticatedClaims = false;

  try {
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      console.warn("Supabase middleware session check failed:", error.name);
      return response;
    }

    hasAuthenticatedClaims = Boolean(data?.claims?.sub);
  } catch (error) {
    console.warn(
      "Supabase middleware session check was interrupted:",
      error instanceof Error ? error.name : "unknown_error"
    );
    return response;
  }

  if (isProtectedPath && !hasAuthenticatedClaims) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    (path === "/login" || path === "/signup") &&
    hasAuthenticatedClaims
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/checkout/:path*",
    "/login",
    "/signup",
  ],
};
