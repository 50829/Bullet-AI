"use client";

import { useEffect, useRef, useState } from "react";
import type { MomentEntity } from "../../../domain/entities";
import type { DataV2StoreApi } from "../../../lib/data-v2";
import { createSignedMomentImageUrl } from "../../workspace/data/remoteRepositoryV2";

const SIGNED_URL_REFRESH_MS = 50 * 60 * 1000;
const SIGNED_URL_MIN_REMAINING_MS = 15 * 60 * 1000;
const SIGNED_URL_RETRY_MS = 30 * 1000;

export type MomentImageSource =
  | {
      clientId: string;
      sourceKey: string;
      kind: "blob";
      blob: Blob;
    }
  | {
      clientId: string;
      sourceKey: string;
      kind: "remote";
      imagePath: string;
    };

type ResolvedImage = {
  sourceKey: string;
  url: string;
  objectUrl: boolean;
  expiresAt: number | null;
};

export function isMomentImageSourceReusable(
  previous: Pick<ResolvedImage, "sourceKey" | "expiresAt"> | undefined,
  sourceKey: string,
  now: number,
) {
  return Boolean(
    previous?.sourceKey === sourceKey &&
    (previous.expiresAt === null ||
      previous.expiresAt > now + SIGNED_URL_MIN_REMAINING_MS),
  );
}

export async function loadMomentImageSources(
  userId: string,
  moments: MomentEntity[],
  store: DataV2StoreApi,
) {
  const mutations = (await store.listPendingMutations(userId))
    .filter((mutation) => mutation.resource === "moments")
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.mutationId.localeCompare(left.mutationId),
    );

  return Promise.all(
    moments.map(async (moment): Promise<MomentImageSource | null> => {
      const candidates = mutations.filter(
        (mutation) => mutation.clientId === moment.clientId,
      );
      for (const candidate of candidates) {
        const blobs = await store.getMutationBlobs(candidate.mutationId);
        const image = blobs.find((blob) => blob.slot === "image");
        if (image) {
          return {
            clientId: moment.clientId,
            sourceKey: `blob:${image.blobId}`,
            kind: "blob",
            blob: image.blob,
          };
        }
        if (
          candidate.kind !== "delete" &&
          Object.hasOwn(candidate.changes, "imagePath")
        ) {
          return null;
        }
      }
      return moment.imagePath
        ? {
            clientId: moment.clientId,
            sourceKey: `remote:${moment.imagePath}`,
            kind: "remote",
            imagePath: moment.imagePath,
          }
        : null;
    }),
  ).then((sources) => sources.filter((source) => source !== null));
}

export function useMomentImageUrls({
  userId,
  moments,
  store,
}: {
  userId: string | null;
  moments: MomentEntity[];
  store: DataV2StoreApi;
}) {
  const resolvedRef = useRef(new Map<string, ResolvedImage>());
  const [imageUrls, setImageUrls] = useState(new Map<string, string>());
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | null = null;
    const createdObjectUrls: string[] = [];

    const resolveImages = async () => {
      const sources = userId
        ? await loadMomentImageSources(userId, moments, store)
        : [];
      const now = Date.now();
      const resolved = await Promise.all(
        sources.map(async (source) => {
          const previous = resolvedRef.current.get(source.clientId);
          const reusable = isMomentImageSourceReusable(
            previous,
            source.sourceKey,
            now,
          );
          if (previous && reusable) {
            return [source.clientId, previous] as const;
          }

          if (source.kind === "blob") {
            const url = URL.createObjectURL(source.blob);
            createdObjectUrls.push(url);
            return [
              source.clientId,
              {
                sourceKey: source.sourceKey,
                url,
                objectUrl: true,
                expiresAt: null,
              },
            ] as const;
          }

          const url = await createSignedMomentImageUrl(source.imagePath);
          return url
            ? ([
                source.clientId,
                {
                  sourceKey: source.sourceKey,
                  url,
                  objectUrl: false,
                  expiresAt: now + 60 * 60 * 1000,
                },
              ] as const)
            : null;
        }),
      );

      if (cancelled) {
        createdObjectUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      const next = new Map(resolved.filter((entry) => entry !== null)) as Map<
        string,
        ResolvedImage
      >;
      resolvedRef.current.forEach((previous, clientId) => {
        if (previous.objectUrl && next.get(clientId)?.url !== previous.url) {
          URL.revokeObjectURL(previous.url);
        }
      });
      resolvedRef.current = next;
      setImageUrls(
        new Map(
          [...next.entries()].map(([clientId, image]) => [clientId, image.url]),
        ),
      );
      setError(null);

      if ([...next.values()].some((image) => image.expiresAt !== null)) {
        refreshTimer = window.setTimeout(
          () => setRefreshToken((value) => value + 1),
          SIGNED_URL_REFRESH_MS,
        );
      }
    };

    void resolveImages().catch((caught) => {
      if (!cancelled) {
        createdObjectUrls.forEach((url) => URL.revokeObjectURL(url));
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        refreshTimer = window.setTimeout(
          () => setRefreshToken((value) => value + 1),
          SIGNED_URL_RETRY_MS,
        );
      }
    });

    return () => {
      cancelled = true;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    };
  }, [moments, refreshToken, store, userId]);

  useEffect(
    () => () => {
      resolvedRef.current.forEach((image) => {
        if (image.objectUrl) URL.revokeObjectURL(image.url);
      });
      resolvedRef.current.clear();
    },
    [],
  );

  return { imageUrls, error };
}
