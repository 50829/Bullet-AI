import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_TIMING_NAME = "supabase-auth";

function attachAuthTiming(response: NextResponse, startedAt: number) {
  const duration = Math.max(0, performance.now() - startedAt).toFixed(1);
  response.headers.set("Server-Timing", `${AUTH_TIMING_NAME};dur=${duration}`);
  return response;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, authenticated: false };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const startedAt = performance.now();

  try {
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      console.error("[middleware] Supabase auth check failed:", error);
    }

    return {
      response: attachAuthTiming(response, startedAt),
      authenticated: !error && Boolean(data?.claims?.sub),
    };
  } catch (error) {
    console.error("[middleware] Supabase auth check failed:", error);
    return {
      response: attachAuthTiming(response, startedAt),
      authenticated: false,
    };
  }
}
