"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";
import {
  cacheRemoteEntities,
  createClientId,
  markEntityDeleted,
  readEntity,
  readEntities,
  upsertEntity,
} from "../lib/localDb/repository";
import { enqueueOutbox } from "../lib/localDb/syncQueue";
import {
  flushOutbox,
  installSyncTriggers,
  subscribeSyncStatus,
} from "../lib/localDb/syncEngine";
import type { LocalCollection, SyncStatus } from "../lib/localDb/types";

type LocalMeta = {
  _local?: {
    pending?: boolean;
    failed?: boolean;
    deleted?: boolean;
  };
  client_id?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

type Moment = LocalMeta & {
  id: number;
  user_id?: string;
  created_at: string;
  content: string;
  image_url?: string | null;
  image_path?: string | null;
  local_file?: File | Blob | null;
  local_file_name?: string | null;
  date?: string;
};

type Reflection = LocalMeta & {
  id: number;
  user_id?: string;
  created_at: string;
  content: string;
  title?: string | null;
  body?: string | null;
  source?: string | null;
  source_type?: string | null;
  location?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};

type Goal = LocalMeta & {
  id: number;
  user_id?: string;
  created_at: string;
  title: string;
  description: string;
  status: string;
  due_date?: string | null;
  progress: number;
  color?: string | null;
  sort_order?: number | null;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};

type LoadingState = {
  moments: boolean;
  reflections: boolean;
  goals: boolean;
};

type AppContextType = {
  userId: string | null;
  moments: Moment[];
  reflections: Reflection[];
  goals: Goal[];
  loading: LoadingState;
  syncStatus: SyncStatus;
  refreshMoments: () => Promise<void>;
  refreshReflections: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  addMoment: (moment: Moment) => void;
  addReflection: (reflection: Reflection) => void;
  addGoal: (goal: Goal) => void;
  updateMoment: (id: number, updates: Partial<Moment>) => void;
  updateReflection: (id: number, updates: Partial<Reflection>) => Promise<void>;
  updateGoal: (id: number, updates: Partial<Goal>) => Promise<void>;
  reorderGoals: (orderedIds: number[]) => Promise<void>;
  deleteMoment: (id: number, imagePath?: string | null) => Promise<void>;
  deleteReflection: (id: number, imagePath?: string | null) => Promise<void>;
  deleteGoal: (id: number, imagePath?: string | null) => Promise<void>;
  retrySync: () => Promise<void>;
  exportData: () => string;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortByCreatedAtDesc<T extends { created_at?: string }>(items: T[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  );
}

function withFormattedDate<T extends { created_at?: string; updated_at?: string }>(item: T) {
  const createdAt = item.created_at || new Date().toISOString();
  return {
    ...item,
    created_at: createdAt,
    updated_at: item.updated_at || createdAt,
    date: formatDate(createdAt),
  };
}

function ensureLocalFields<
  T extends LocalMeta & { id?: number; user_id?: string; created_at?: string }
>(
  collection: LocalCollection,
  item: T,
  userId: string | null,
): T & { id: number; client_id: string; created_at: string; updated_at: string } {
  const now = new Date().toISOString();
  const prefix = collection.replace(/s$/, "");
  return {
    ...item,
    id: item.id ?? Date.now(),
    user_id: item.user_id ?? userId ?? undefined,
    client_id: item.client_id || createClientId(prefix),
    created_at: item.created_at || now,
    updated_at: now,
    deleted_at: item.deleted_at ?? null,
  };
}

function visibleRemoteRows<T extends { deleted_at?: string | null }>(items: T[] | null) {
  return (items ?? []).filter((item) => !item.deleted_at);
}

async function getSignedImageUrl(bucket: string, imagePath?: string | null) {
  if (!imagePath) return null;

  const result = await supabase.storage.from(bucket).createSignedUrl(imagePath, 60 * 60);
  if (result.error || !result.data) return null;
  return result.data.signedUrl ?? null;
}

async function attachSignedUrls<T extends { image_path?: string | null; created_at?: string }>(
  bucket: "moments" | "reflections" | "goals",
  items: T[],
) {
  return Promise.all(
    items.map(async (item) => ({
      ...withFormattedDate(item),
      image_url: item.image_path ? await getSignedImageUrl(bucket, item.image_path) : null,
    })),
  );
}

function stripLocalFields<T extends Record<string, unknown>>(value: T) {
  const payload = { ...value };
  delete payload._local;
  delete payload.date;
  delete payload.image_url;
  return payload;
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [loading, setLoading] = useState<LoadingState>({
    moments: true,
    reflections: true,
    goals: true,
  });

  const setCollectionLoading = useCallback((collection: keyof LoadingState, value: boolean) => {
    setLoading((current) => ({ ...current, [collection]: value }));
  }, []);

  const loadCachedCollection = useCallback(
    async <T extends { created_at?: string }>(
      activeUserId: string,
      collection: LocalCollection,
      setItems: React.Dispatch<React.SetStateAction<T[]>>,
      loadingKey: keyof LoadingState,
    ) => {
      try {
        const cached = await readEntities<T>(activeUserId, collection);
        if (cached.length > 0) {
          setItems(sortByCreatedAtDesc(cached.map(withFormattedDate) as T[]));
          setCollectionLoading(loadingKey, false);
        }
      } catch (error) {
        console.error(`Failed to read ${collection} cache:`, error);
      }
    },
    [setCollectionLoading],
  );

  const revalidateMoments = useCallback(
    async (activeUserId = userId, options?: { showLoading?: boolean }) => {
      if (!activeUserId) return;
      if (options?.showLoading) setCollectionLoading("moments", true);

      try {
        const { data, error } = await supabase
          .from("moments")
          .select("*")
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        const remote = await attachSignedUrls("moments", visibleRemoteRows(data ?? []));
        await cacheRemoteEntities(activeUserId, "moments", remote);
        const merged = await readEntities<Moment>(activeUserId, "moments");
        setMoments(sortByCreatedAtDesc(merged.map(withFormattedDate)));
      } catch (error) {
        console.error("Failed to revalidate moments:", error);
      } finally {
        setCollectionLoading("moments", false);
      }
    },
    [setCollectionLoading, userId],
  );

  const revalidateReflections = useCallback(
    async (activeUserId = userId, options?: { showLoading?: boolean }) => {
      if (!activeUserId) return;
      if (options?.showLoading) setCollectionLoading("reflections", true);

      try {
        const { data, error } = await supabase
          .from("reflections")
          .select("*")
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        const remote = await attachSignedUrls("reflections", visibleRemoteRows(data ?? []));
        await cacheRemoteEntities(activeUserId, "reflections", remote);
        const merged = await readEntities<Reflection>(activeUserId, "reflections");
        setReflections(sortByCreatedAtDesc(merged.map(withFormattedDate)));
      } catch (error) {
        console.error("Failed to revalidate reflections:", error);
      } finally {
        setCollectionLoading("reflections", false);
      }
    },
    [setCollectionLoading, userId],
  );

  const revalidateGoals = useCallback(
    async (activeUserId = userId, options?: { showLoading?: boolean }) => {
      if (!activeUserId) return;
      if (options?.showLoading) setCollectionLoading("goals", true);

      try {
        const { data, error } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        const remote = await attachSignedUrls("goals", visibleRemoteRows(data ?? []));
        await cacheRemoteEntities(activeUserId, "goals", remote);
        const merged = await readEntities<Goal>(activeUserId, "goals");
        setGoals(sortByCreatedAtDesc(merged.map(withFormattedDate)));
      } catch (error) {
        console.error("Failed to revalidate goals:", error);
      } finally {
        setCollectionLoading("goals", false);
      }
    },
    [setCollectionLoading, userId],
  );

  useEffect(() => {
    let isMounted = true;
    const unsubscribeSync = subscribeSyncStatus(setSyncStatus);
    const uninstallSyncTriggers = installSyncTriggers();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const activeUserId = session?.user?.id ?? null;

      if (!isMounted) return;

      if (!activeUserId) {
        setUserId(null);
        setMoments([]);
        setReflections([]);
        setGoals([]);
        setLoading({ moments: false, reflections: false, goals: false });
        return;
      }

      setUserId(activeUserId);
      await Promise.all([
        loadCachedCollection<Moment>(activeUserId, "moments", setMoments, "moments"),
        loadCachedCollection<Reflection>(
          activeUserId,
          "reflections",
          setReflections,
          "reflections",
        ),
        loadCachedCollection<Goal>(activeUserId, "goals", setGoals, "goals"),
      ]);

      void Promise.all([
        revalidateMoments(activeUserId),
        revalidateReflections(activeUserId),
        revalidateGoals(activeUserId),
        flushOutbox(),
      ]);
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const activeUserId = session?.user?.id ?? null;
      setUserId(activeUserId);
      if (activeUserId) {
        void Promise.all([
          loadCachedCollection<Moment>(activeUserId, "moments", setMoments, "moments"),
          loadCachedCollection<Reflection>(
            activeUserId,
            "reflections",
            setReflections,
            "reflections",
          ),
          loadCachedCollection<Goal>(activeUserId, "goals", setGoals, "goals"),
        ]).then(() =>
          Promise.all([
            revalidateMoments(activeUserId),
            revalidateReflections(activeUserId),
            revalidateGoals(activeUserId),
            flushOutbox(),
          ]),
        );
      } else {
        setMoments([]);
        setReflections([]);
        setGoals([]);
        setLoading({ moments: false, reflections: false, goals: false });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      unsubscribeSync();
      uninstallSyncTriggers();
    };
  }, [
    loadCachedCollection,
    revalidateGoals,
    revalidateMoments,
    revalidateReflections,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void revalidateMoments();
      void revalidateReflections();
      void revalidateGoals();
    }, 50 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [revalidateGoals, revalidateMoments, revalidateReflections]);

  const queueUpdate = useCallback(
    async <T extends { id: number | string; user_id?: string }>(
      collection: LocalCollection,
      entity: T,
      operation: "upsert" | "update" = "update",
    ) => {
      if (!userId) return;

      const payload = {
        ...stripLocalFields(entity as Record<string, unknown>),
        user_id: entity.user_id ?? userId,
      };

      await upsertEntity(userId, collection, payload, { pending: true });
      await enqueueOutbox({
        userId,
        collection,
        entityId: entity.id,
        operation,
        payload,
      });
      void flushOutbox();
    },
    [userId],
  );

  const addMoment = useCallback(
    (moment: Moment) => {
      const nextMoment = withFormattedDate(ensureLocalFields("moments", moment, userId));
      setMoments((current) => sortByCreatedAtDesc([nextMoment, ...current]));
      void queueUpdate("moments", nextMoment, "upsert");
    },
    [queueUpdate, userId],
  );

  const addReflection = useCallback(
    (reflection: Reflection) => {
      const nextReflection = withFormattedDate(ensureLocalFields("reflections", reflection, userId));
      setReflections((current) => sortByCreatedAtDesc([nextReflection, ...current]));
      void queueUpdate("reflections", nextReflection, "upsert");
    },
    [queueUpdate, userId],
  );

  const addGoal = useCallback(
    (goal: Goal) => {
      const nextGoal = withFormattedDate(ensureLocalFields("goals", goal, userId));
      setGoals((current) => sortByCreatedAtDesc([nextGoal, ...current]));
      void queueUpdate("goals", nextGoal, "upsert");
    },
    [queueUpdate, userId],
  );

  const updateMoment = useCallback(
    (id: number, updates: Partial<Moment>) => {
      setMoments((current) => {
        const updatedAt = new Date().toISOString();
        const next = current.map((moment) =>
          moment.id === id ? withFormattedDate({ ...moment, ...updates, updated_at: updatedAt }) : moment,
        );
        const updated = next.find((moment) => moment.id === id);
        if (updated) void queueUpdate("moments", updated, "update");
        return sortByCreatedAtDesc(next);
      });
    },
    [queueUpdate],
  );

  const updateReflection = useCallback(
    async (id: number, updates: Partial<Reflection>) => {
      setReflections((current) => {
        const updatedAt = new Date().toISOString();
        const next = current.map((reflection) =>
          reflection.id === id ? withFormattedDate({ ...reflection, ...updates, updated_at: updatedAt }) : reflection,
        );
        const updated = next.find((reflection) => reflection.id === id);
        if (updated) void queueUpdate("reflections", updated, "update");
        return sortByCreatedAtDesc(next);
      });
    },
    [queueUpdate],
  );

  const updateGoal = useCallback(
    async (id: number, updates: Partial<Goal>) => {
      setGoals((current) => {
        const updatedAt = new Date().toISOString();
        const next = current.map((goal) =>
          goal.id === id ? withFormattedDate({ ...goal, ...updates, updated_at: updatedAt }) : goal,
        );
        const updated = next.find((goal) => goal.id === id);
        if (updated) void queueUpdate("goals", updated, "update");
        return sortByCreatedAtDesc(next);
      });
    },
    [queueUpdate],
  );

  const reorderGoals = useCallback(
    async (orderedIds: number[]) => {
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
      setGoals((current) => {
        const updatedAt = new Date().toISOString();
        const next = current.map((goal) =>
          orderMap.has(goal.id)
            ? withFormattedDate({ ...goal, sort_order: orderMap.get(goal.id)!, updated_at: updatedAt })
            : goal,
        );
        orderedIds.forEach((id) => {
          const updated = next.find((goal) => goal.id === id);
          if (updated) void queueUpdate("goals", updated, "update");
        });
        return sortByCreatedAtDesc(next);
      });
    },
    [queueUpdate],
  );

  const queueDelete = useCallback(
    async (collection: LocalCollection, id: number, imagePath?: string | null) => {
      if (!userId) return;

      const deletedAt = new Date().toISOString();
      const existing = await readEntity<Record<string, unknown>>(userId, collection, id);
      const clientId =
        typeof existing?.data?.client_id === "string" ? existing.data.client_id : undefined;
      await markEntityDeleted(userId, collection, id);
      await enqueueOutbox({
        userId,
        collection,
        entityId: id,
        operation: "delete",
        payload: {
          id,
          client_id: clientId,
          user_id: userId,
          image_path: imagePath ?? null,
          deleted_at: deletedAt,
        },
      });
      void flushOutbox();
    },
    [userId],
  );

  const deleteMoment = useCallback(
    async (id: number, imagePath?: string | null) => {
      setMoments((current) => current.filter((moment) => moment.id !== id));
      await queueDelete("moments", id, imagePath);
    },
    [queueDelete],
  );

  const deleteReflection = useCallback(
    async (id: number, imagePath?: string | null) => {
      setReflections((current) => current.filter((reflection) => reflection.id !== id));
      await queueDelete("reflections", id, imagePath);
    },
    [queueDelete],
  );

  const deleteGoal = useCallback(
    async (id: number, imagePath?: string | null) => {
      setGoals((current) => current.filter((goal) => goal.id !== id));
      await queueDelete("goals", id, imagePath);
    },
    [queueDelete],
  );

  const retrySync = useCallback(async () => {
    await flushOutbox();
  }, []);

  const exportData = useCallback(() => {
    return JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        moments,
        goals,
        reflections,
      },
      null,
      2,
    );
  }, [goals, moments, reflections]);

  const value = useMemo<AppContextType>(
    () => ({
      userId,
      moments,
      reflections,
      goals,
      loading,
      syncStatus,
      refreshMoments: () => revalidateMoments(),
      refreshReflections: () => revalidateReflections(),
      refreshGoals: () => revalidateGoals(),
      addMoment,
      addReflection,
      addGoal,
      updateMoment,
      updateReflection,
      updateGoal,
      reorderGoals,
      deleteMoment,
      deleteReflection,
      deleteGoal,
      retrySync,
      exportData,
    }),
    [
      addGoal,
      addMoment,
      addReflection,
      deleteGoal,
      deleteMoment,
      deleteReflection,
      exportData,
      goals,
      loading,
      moments,
      reflections,
      revalidateGoals,
      revalidateMoments,
      revalidateReflections,
      reorderGoals,
      retrySync,
      syncStatus,
      updateGoal,
      updateMoment,
      updateReflection,
      userId,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
