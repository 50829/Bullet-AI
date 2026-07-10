import type { DataV2Notifier } from "./channel";
import type { DataV2StoreApi } from "./store";
import type {
  AnyMutationRecord,
  DataResource,
  EntityByResource,
  RemoteMutationExecutor,
  RemoteMutationRequest,
} from "./types";

export type SyncLockProvider = {
  request(
    name: string,
    options: { ifAvailable: true },
    callback: (lock: object | null) => Promise<void>,
  ): Promise<void>;
};

export type SyncEnvironment = {
  now(): Date;
  random(): number;
  isOnline(): boolean;
  isVisible(): boolean;
  setTimer(
    callback: () => void,
    delayMs: number,
  ): ReturnType<typeof setTimeout>;
  clearTimer(timer: ReturnType<typeof setTimeout>): void;
  onOnline(callback: () => void): () => void;
  onVisibilityChange(callback: () => void): () => void;
  locks?: SyncLockProvider;
};

function defaultEnvironment(): SyncEnvironment {
  return {
    now: () => new Date(),
    random: () => Math.random(),
    isOnline: () =>
      typeof navigator === "undefined" ? true : navigator.onLine,
    isVisible: () =>
      typeof document === "undefined" || document.visibilityState === "visible",
    setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
    clearTimer: (timer) => clearTimeout(timer),
    onOnline: (callback) => {
      if (typeof window === "undefined") return () => undefined;
      window.addEventListener("online", callback);
      return () => window.removeEventListener("online", callback);
    },
    onVisibilityChange: (callback) => {
      if (typeof document === "undefined") return () => undefined;
      document.addEventListener("visibilitychange", callback);
      return () => document.removeEventListener("visibilitychange", callback);
    },
    locks:
      typeof navigator !== "undefined" && navigator.locks
        ? (navigator.locks as unknown as SyncLockProvider)
        : undefined,
  };
}

export function calculateRetryDelay(
  attemptCount: number,
  options: {
    baseMs?: number;
    maxMs?: number;
    random?: number;
    retryAfterMs?: number;
  } = {},
) {
  const baseMs = options.baseMs ?? 1_000;
  const maxMs = options.maxMs ?? 30 * 60 * 1_000;
  const exponent = Math.min(Math.max(0, attemptCount - 1), 20);
  const exponential = Math.min(maxMs, baseMs * 2 ** exponent);
  const jitter = 0.8 + (options.random ?? Math.random()) * 0.4;
  return Math.min(
    maxMs,
    Math.max(options.retryAfterMs ?? 0, Math.round(exponential * jitter)),
  );
}

export class DataSyncWorker {
  private started = false;
  private authPaused = false;
  private needsRecovery = true;
  private activeFlush: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private currentRequest: AbortController | null = null;
  private lockUnavailable = false;
  private unsubscribers: Array<() => void> = [];

  constructor(
    private readonly options: {
      userId: string;
      store: DataV2StoreApi;
      executor: RemoteMutationExecutor;
      notifier?: DataV2Notifier;
      environment?: SyncEnvironment;
      lockName?: string;
    },
  ) {}

  get isAuthPaused() {
    return this.authPaused;
  }

  private get environment() {
    return this.options.environment ?? defaultEnvironment();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.needsRecovery = true;
    this.unsubscribers = [
      this.environment.onOnline(() => {
        if (this.canFlush()) void this.requestFlush();
      }),
      this.environment.onVisibilityChange(() => {
        if (this.canFlush()) void this.requestFlush();
      }),
    ];
    if (this.options.notifier) {
      this.unsubscribers.push(
        this.options.notifier.subscribe((event) => {
          if (
            event.userId === this.options.userId &&
            event.mutationId &&
            this.canFlush()
          ) {
            void this.requestFlush();
          }
        }),
      );
    }
    if (this.canFlush()) void this.requestFlush();
  }

  stop() {
    this.started = false;
    this.unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    this.clearRetryTimer();
    this.currentRequest?.abort();
    this.currentRequest = null;
  }

  async resumeAfterAuth() {
    await this.options.store.resumeAuthBlocked(this.options.userId);
    this.authPaused = false;
    if (this.canFlush()) await this.requestFlush();
  }

  requestFlush() {
    if (!this.started || !this.canFlush()) return Promise.resolve();
    if (this.activeFlush) return this.activeFlush;
    this.clearRetryTimer();
    this.activeFlush = this.flushWithLock()
      .finally(() => {
        this.activeFlush = null;
      })
      .then(() => this.scheduleNextAttempt());
    return this.activeFlush;
  }

  private canFlush() {
    return (
      this.started &&
      !this.authPaused &&
      this.environment.isOnline() &&
      this.environment.isVisible()
    );
  }

  private async flushWithLock() {
    const locks = this.environment.locks;
    if (!locks) {
      this.lockUnavailable = false;
      await this.drain();
      return;
    }
    await locks.request(
      this.options.lockName ?? `bullet-ai-data-v2:${this.options.userId}`,
      { ifAvailable: true },
      async (lock) => {
        this.lockUnavailable = !lock;
        if (lock) await this.drain();
      },
    );
  }

  private async drain() {
    if (this.needsRecovery) {
      await Promise.all([
        this.options.store.recoverSending(this.options.userId),
        this.options.store.resumeAuthBlocked(this.options.userId),
      ]);
      this.needsRecovery = false;
    }

    let processed = 0;
    while (this.canFlush() && processed < 100) {
      const runnable = await this.options.store.listRunnableMutations(
        this.options.userId,
        this.environment.now().toISOString(),
      );
      if (runnable.length === 0) break;

      for (const candidate of runnable) {
        if (!this.canFlush() || processed >= 100) break;
        const claimed = await this.options.store.claimMutation(
          candidate.mutationId,
        );
        if (!claimed) continue;
        processed += 1;
        const shouldContinue = await this.executeMutation(claimed);
        if (!shouldContinue) return;
      }
    }
  }

  private async executeMutation(mutation: AnyMutationRecord) {
    const blobs = await this.options.store.getMutationBlobs(
      mutation.mutationId,
    );
    const request: RemoteMutationRequest<DataResource> = {
      mutationId: mutation.mutationId,
      userId: mutation.userId,
      resource: mutation.resource,
      clientId: mutation.clientId,
      kind: mutation.kind,
      baseVersion: mutation.baseVersion,
      changes: mutation.changes,
      optimistic: mutation.optimistic,
      blobs,
      cleanup: mutation.cleanup,
      conflictRecoveryCreate: mutation.conflictRecoveryCreate,
    };
    const controller = new AbortController();
    this.currentRequest = controller;

    try {
      const result = await this.options.executor.execute(
        request,
        controller.signal,
      );
      if (result.kind === "applied") {
        await this.options.store.completeMutation(
          mutation.mutationId,
          result.entity as EntityByResource[DataResource] | null,
        );
        return true;
      }
      if (result.kind === "conflict") {
        await this.options.store.recordConflict(
          mutation.mutationId,
          result.remote as EntityByResource[DataResource] | null,
          result.reason,
        );
        return true;
      }
      if (result.kind === "auth") {
        await this.options.store.blockMutation(
          mutation.mutationId,
          "auth",
          result.error,
        );
        this.authPaused = true;
        return false;
      }
      if (result.kind === "permanent") {
        await this.options.store.blockMutation(
          mutation.mutationId,
          "permanent",
          result.error,
        );
        return true;
      }
      await this.retryTransient(mutation, result.error, result.retryAfterMs);
      return true;
    } catch (error) {
      await this.retryTransient(
        mutation,
        error instanceof Error ? error.message : String(error),
      );
      return true;
    } finally {
      if (this.currentRequest === controller) this.currentRequest = null;
    }
  }

  private async retryTransient(
    mutation: AnyMutationRecord,
    error: string,
    retryAfterMs?: number,
  ) {
    const delay = calculateRetryDelay(mutation.attemptCount, {
      random: this.environment.random(),
      retryAfterMs,
    });
    const nextAttemptAt = new Date(
      this.environment.now().getTime() + delay,
    ).toISOString();
    await this.options.store.requeueTransient(
      mutation.mutationId,
      error,
      nextAttemptAt,
    );
  }

  private async scheduleNextAttempt() {
    if (!this.canFlush()) return;
    const nextAt = await this.options.store.getNextQueuedAt(
      this.options.userId,
    );
    if (!nextAt) return;
    const delay = Math.max(
      this.lockUnavailable ? 1_000 : 0,
      Math.min(
        2_147_000_000,
        new Date(nextAt).getTime() - this.environment.now().getTime(),
      ),
    );
    this.retryTimer = this.environment.setTimer(() => {
      this.retryTimer = null;
      if (this.canFlush()) void this.requestFlush();
    }, delay);
  }

  private clearRetryTimer() {
    if (!this.retryTimer) return;
    this.environment.clearTimer(this.retryTimer);
    this.retryTimer = null;
  }
}
