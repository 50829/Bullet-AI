// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HistoryLoadMoreButton } from "./HistoryLoadMoreButton";

vi.mock("@/shared/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) =>
      key === "loadEarlierRecords" ? "Load earlier records" : "Loading...",
  }),
}));

afterEach(cleanup);

describe("HistoryLoadMoreButton", () => {
  it("loads the next page once when ready", async () => {
    const onLoadMore = vi.fn().mockResolvedValue(undefined);
    render(
      createElement(HistoryLoadMoreButton, { loading: false, onLoadMore }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Load earlier records" }),
    );
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("is disabled and reports busy while a page is loading", () => {
    render(
      createElement(HistoryLoadMoreButton, {
        loading: true,
        onLoadMore: vi.fn(),
      }),
    );

    const button = screen.getByRole("button", { name: "Loading..." });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
});
