import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_AI_RATE_LIMIT_PER_HOUR,
  MAX_AI_MESSAGE_CHARS,
} from "../../../lib/ai/requestPolicy";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("../../../lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

function createRequest(body: unknown) {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createSupabaseMock(options?: {
  user?: { id: string } | null;
  count?: number | null;
  countError?: { message: string } | null;
  insertError?: { message: string } | null;
}) {
  const user = options?.user === undefined ? { id: "user-1" } : options.user;

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table !== "ai_usage_events") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(async () => ({
              count: options?.count ?? 0,
              error: options?.countError ?? null,
            })),
          })),
        })),
        insert: vi.fn(async () => ({
          error: options?.insertError ?? null,
        })),
      };
    }),
  };
}

describe("/api/ai", () => {
  beforeEach(() => {
    mocks.createClient.mockReset();
    mocks.fetch.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubEnv("LLM_API_KEY", "test-key");
    vi.stubEnv("LLM_BASE_URL", "https://llm.example/v1");
    vi.stubEnv("LLM_MODEL", "test-model");
  });

  it("returns 401 when the user is not authenticated", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock({ user: null }));

    const response = await POST(
      createRequest({ messages: [{ role: "user", content: "hi" }] }),
    );

    expect(response.status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 for oversized message content", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock());

    const response = await POST(
      createRequest({
        messages: [
          { role: "user", content: "x".repeat(MAX_AI_MESSAGE_CHARS + 1) },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("returns 429 when the hourly user limit is reached", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabaseMock({ count: DEFAULT_AI_RATE_LIMIT_PER_HOUR }),
    );

    const response = await POST(
      createRequest({ messages: [{ role: "user", content: "hi" }] }),
    );

    expect(response.status).toBe(429);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("calls the LLM for valid authenticated requests", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock({ count: 0 }));
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "hello there" } }],
      }),
    });

    const response = await POST(
      createRequest({ messages: [{ role: "user", content: "hi" }] }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ reply: "hello there" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});
