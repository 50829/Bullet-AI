import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getClaims: authMocks.getClaims },
  })),
}));

import { updateSession } from "./middleware";

describe("updateSession", () => {
  beforeEach(() => {
    authMocks.getClaims.mockReset();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  });

  it("accepts a verified subject and reports auth timing", async () => {
    authMocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1" } },
      error: null,
    });

    const result = await updateSession(new NextRequest("http://localhost/goals"));

    expect(result.authenticated).toBe(true);
    expect(result.response.headers.get("Server-Timing")).toMatch(/^supabase-auth;dur=\d/);
  });

  it("rejects an invalid claims response", async () => {
    authMocks.getClaims.mockResolvedValue({
      data: null,
      error: new Error("invalid token"),
    });

    const result = await updateSession(new NextRequest("http://localhost/goals"));

    expect(result.authenticated).toBe(false);
  });
});
