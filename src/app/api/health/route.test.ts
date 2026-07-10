import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  };
  logger.child.mockReturnValue(logger);
  return { logger };
});

vi.mock("../../../lib/observability/logger", () => ({ logger: mocks.logger }));

const { GET } = await import("./route");

describe("/api/health", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reports healthy configuration without exposing values", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "secret-value");

    const response = await GET(
      new Request("http://localhost/api/health", {
        headers: { "x-request-id": "health-1" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("health-1");
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      checks: { configuration: "ok" },
    });
  });

  it("fails readiness when required configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const response = await GET(new Request("http://localhost/api/health"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "misconfigured",
      checks: { configuration: "failed" },
    });
  });
});
