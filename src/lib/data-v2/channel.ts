import type { DataResource } from "./types";

export type DataV2Event = {
  type:
    | "mutation-enqueued"
    | "mutation-changed"
    | "snapshot-changed"
    | "conflict-recorded";
  userId: string;
  resource: DataResource;
  clientId: string;
  mutationId?: string;
};

export interface DataV2Notifier {
  publish(event: DataV2Event): void;
  subscribe(listener: (event: DataV2Event) => void): () => void;
  close(): void;
}

type BroadcastChannelLike = {
  postMessage(message: DataV2Event): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<DataV2Event>) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<DataV2Event>) => void,
  ): void;
  close(): void;
};

export class DataV2Broadcast implements DataV2Notifier {
  private readonly listeners = new Set<(event: DataV2Event) => void>();
  private readonly channel: BroadcastChannelLike | null;

  constructor(
    name = "bullet-ai-data-v2",
    channelFactory:
      | ((name: string) => BroadcastChannelLike)
      | null = typeof BroadcastChannel === "undefined"
      ? null
      : (channelName) => new BroadcastChannel(channelName),
  ) {
    this.channel = channelFactory?.(name) ?? null;
    this.channel?.addEventListener("message", this.handleMessage);
  }

  publish(event: DataV2Event) {
    this.listeners.forEach((listener) => listener(event));
    this.channel?.postMessage(event);
  }

  subscribe(listener: (event: DataV2Event) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.channel?.removeEventListener("message", this.handleMessage);
    this.channel?.close();
    this.listeners.clear();
  }

  private readonly handleMessage = (message: MessageEvent<DataV2Event>) => {
    this.listeners.forEach((listener) => listener(message.data));
  };
}
