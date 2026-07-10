import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const responses: Array<{ data: Record<string, unknown>[]; error: null }> = [];
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.gte = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() =>
    Promise.resolve(responses.shift() ?? { data: [], error: null }),
  );
  return {
    responses,
    query,
    from: vi.fn(() => query),
  };
});

vi.mock("../../lib/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    storage: {
      from: vi.fn(() => ({ createSignedUrl: vi.fn() })),
    },
  },
}));

const { loadRemoteResource, loadRemoteResourcePage } =
  await import("./resource-reader");

function momentRow({
  clientId,
  occurredOn,
  createdAt,
}: {
  clientId: string;
  occurredOn: string;
  createdAt: string;
}) {
  return {
    id: clientId,
    client_id: clientId,
    user_id: "user-1",
    content: clientId,
    occurred_on: occurredOn,
    image_path: null,
    version: 1,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function reflectionRow(clientId: string, updatedAt: string) {
  return {
    id: clientId,
    client_id: clientId,
    user_id: "user-1",
    title: clientId,
    body: clientId,
    version: 1,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: updatedAt,
  };
}

describe("remote history cursor pages", () => {
  beforeEach(() => {
    mocks.responses.length = 0;
    mocks.from.mockClear();
    Object.values(mocks.query).forEach((method) => method.mockClear());
  });

  it("uses the complete moment ordering tuple as the next keyset cursor", async () => {
    const first = momentRow({
      clientId: "moment-z",
      occurredOn: "2026-07-10",
      createdAt: "2026-07-10T08:00:00.000Z",
    });
    const second = momentRow({
      clientId: "moment-b",
      occurredOn: "2026-07-10",
      createdAt: "2026-07-10T07:00:00.000Z",
    });
    const lookahead = momentRow({
      clientId: "moment-a",
      occurredOn: "2026-07-10",
      createdAt: "2026-07-10T07:00:00.000Z",
    });
    mocks.responses.push({ data: [first, second, lookahead], error: null });

    const page = await loadRemoteResourcePage("user-1", "moments", {
      pageSize: 2,
    });

    expect(page.items.map((item) => item.clientId)).toEqual([
      "moment-z",
      "moment-b",
    ]);
    expect(page.nextCursor).toEqual({
      occurredOn: "2026-07-10",
      createdAt: "2026-07-10T07:00:00.000Z",
      clientId: "moment-b",
    });
    expect(mocks.query.limit).toHaveBeenCalledWith(3);

    mocks.responses.push({ data: [lookahead], error: null });
    const finalPage = await loadRemoteResourcePage("user-1", "moments", {
      pageSize: 2,
      cursor: page.nextCursor,
    });

    expect(mocks.query.or).toHaveBeenLastCalledWith(
      expect.stringContaining(
        'occurred_on.eq.2026-07-10,created_at.eq."2026-07-10T07:00:00.000Z",client_id.lt."moment-b"',
      ),
    );
    expect(finalPage.items.map((item) => item.clientId)).toEqual(["moment-a"]);
    expect(finalPage.nextCursor).toBeNull();
  });

  it("uses updated_at and client_id together for reflection keysets", async () => {
    const timestamp = "2026-07-10T08:00:00.000Z";
    mocks.responses.push({
      data: [
        reflectionRow("reflection-c", timestamp),
        reflectionRow("reflection-b", timestamp),
        reflectionRow("reflection-a", timestamp),
      ],
      error: null,
    });

    const page = await loadRemoteResourcePage("user-1", "reflections", {
      pageSize: 2,
    });
    expect(page.nextCursor).toEqual({
      updatedAt: timestamp,
      clientId: "reflection-b",
    });

    mocks.responses.push({
      data: [reflectionRow("reflection-a", timestamp)],
      error: null,
    });
    await loadRemoteResourcePage("user-1", "reflections", {
      pageSize: 2,
      cursor: page.nextCursor,
    });

    expect(mocks.query.or).toHaveBeenLastCalledWith(
      `updated_at.lt."${timestamp}",and(updated_at.eq."${timestamp}",client_id.lt."reflection-b")`,
    );
    expect(mocks.query.order.mock.calls.slice(-2)).toEqual([
      ["updated_at", { ascending: false }],
      ["client_id", { ascending: false }],
    ]);
  });

  it("keeps the full-history compatibility API on top of cursor pages", async () => {
    const rows = Array.from({ length: 101 }, (_, index) =>
      momentRow({
        clientId: `moment-${String(101 - index).padStart(3, "0")}`,
        occurredOn: "2026-01-01",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    mocks.responses.push(
      { data: rows, error: null },
      { data: [rows[100]], error: null },
    );

    const history = await loadRemoteResource("user-1", "moments", {
      fullHistory: true,
    });

    expect(history).toHaveLength(101);
    expect(history.at(-1)?.clientId).toBe("moment-001");
    expect(mocks.query.limit).toHaveBeenNthCalledWith(1, 101);
    expect(mocks.query.limit).toHaveBeenNthCalledWith(2, 101);
    expect(mocks.query.or).toHaveBeenCalledOnce();
  });
});
