import { describe, expect, it } from "vitest";

import { parseReflectionContent } from "./reflectionContent";

describe("parseReflectionContent", () => {
  it("prefers structured reflection fields", () => {
    expect(
      parseReflectionContent({ content: "legacy", title: "Title", body: "Body" }),
    ).toEqual({ title: "Title", body: "Body" });
  });

  it("parses the legacy title and body format", () => {
    expect(parseReflectionContent({ content: "Title\n\nBody" })).toEqual({
      title: "Title",
      body: "Body",
    });
  });
});
