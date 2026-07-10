import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AI feature boundaries", () => {
  it("keeps assistant UI and chat state in features/ai", () => {
    expect(
      existsSync(new URL("./components/AssistantDrawer.tsx", import.meta.url)),
    ).toBe(true);
    expect(
      existsSync(new URL("./chat/useAssistantChat.ts", import.meta.url)),
    ).toBe(true);
    expect(
      existsSync(
        new URL("../../app/components/AssistantDrawer.tsx", import.meta.url),
      ),
    ).toBe(false);
    expect(
      existsSync(new URL("../../app/components/assistant", import.meta.url)),
    ).toBe(false);
  });

  it("keeps the API route as a thin service entrypoint", () => {
    const source = readFileSync(
      new URL("../../app/api/ai/route.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("runAssistantTurn");
    expect(source).toContain("parseAssistantRequestBody");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("/chat/completions");
  });
});
