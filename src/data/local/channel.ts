import type { DataResource } from "./types";
import { DATA_BROADCAST_CHANNEL_NAME } from "../protocol";

export type DataEvent = {
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

export interface DataNotifier {
  publish(event: DataEvent): void;
  subscribe(listener: (event: DataEvent) => void): () => void;
  close(): void;
}

type BroadcastChannelLike = {
  postMessage(message: DataEvent): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<DataEvent>) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<DataEvent>) => void,
  ): void;
  close(): void;
};

export class DataBroadcast implements DataNotifier {
  private readonly listeners = new Set<(event: DataEvent) => void>();
  private readonly channel: BroadcastChannelLike | null;

  constructor(
    name = DATA_BROADCAST_CHANNEL_NAME,
    channelFactory:
      | ((name: string) => BroadcastChannelLike)
      | null = typeof BroadcastChannel === "undefined"
      ? null
      : (channelName) => new BroadcastChannel(channelName),
  ) {
    this.channel = channelFactory?.(name) ?? null;
    this.channel?.addEventListener("message", this.handleMessage);
  }

  publish(event: DataEvent) {
    this.listeners.forEach((listener) => listener(event));
    this.channel?.postMessage(event);
  }

  subscribe(listener: (event: DataEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.channel?.removeEventListener("message", this.handleMessage);
    this.channel?.close();
    this.listeners.clear();
  }

  private readonly handleMessage = (message: MessageEvent<DataEvent>) => {
    this.listeners.forEach((listener) => listener(message.data));
  };
}
