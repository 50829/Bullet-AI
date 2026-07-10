import { describe, expect, it } from "vitest";
import {
  DATA_BROADCAST_CHANNEL_NAME,
  DATA_DATABASE_NAME,
  DATA_LOGOUT_CLEANUP_STORAGE_PREFIX,
  DATA_LOGOUT_EPOCH_STORAGE_PREFIX,
  DATA_QUERY_KEY_PREFIX,
  DATA_WEB_LOCK_PREFIX,
} from "./protocol";

describe("persisted data protocol", () => {
  it("keeps deployed storage and coordination identifiers stable", () => {
    expect(DATA_DATABASE_NAME).toBe("bullet-ai-data-v2");
    expect(DATA_BROADCAST_CHANNEL_NAME).toBe("bullet-ai-data-v2");
    expect(DATA_WEB_LOCK_PREFIX).toBe("bullet-ai-data-v2");
    expect(DATA_QUERY_KEY_PREFIX).toBe("data-v2");
    expect(DATA_LOGOUT_EPOCH_STORAGE_PREFIX).toBe(
      "bullet-ai:data-v2:logout-epoch:",
    );
    expect(DATA_LOGOUT_CLEANUP_STORAGE_PREFIX).toBe(
      "bullet-ai:data-v2:logout-cleanup:",
    );
  });
});
