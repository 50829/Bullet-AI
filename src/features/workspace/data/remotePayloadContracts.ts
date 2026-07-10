import type {
  DataResource,
  EntityByResource,
  VersionedEntity,
} from "../../../domain/entities";

type DataByResource = {
  [R in DataResource]: Omit<EntityByResource[R], keyof VersionedEntity>;
};

export type RemoteInsertPayloadByResource = {
  profiles: {
    user_id: string;
    username: string | null;
    preferred_language: EntityByResource["profiles"]["preferredLanguage"];
    accent_color: EntityByResource["profiles"]["accentColor"];
    color_scheme: EntityByResource["profiles"]["colorScheme"];
    completed_goal_retention: EntityByResource["profiles"]["completedGoalRetention"];
    week_starts_on: EntityByResource["profiles"]["weekStartsOn"];
  };
  moments: {
    client_id: string;
    user_id: string;
    content: string;
    occurred_on: string;
    image_path: string | null;
  };
  reflections: {
    client_id: string;
    user_id: string;
    title: string;
    body: string;
  };
  goals: {
    client_id: string;
    user_id: string;
    title: string;
    description: string;
    due_date: string | null;
    completed_at: string | null;
    color: string | null;
    sort_order: number;
  };
  habits: {
    client_id: string;
    user_id: string;
    name: string;
    description: string | null;
    frequency: EntityByResource["habits"]["frequency"];
    color: string | null;
    started_on: string;
  };
  habit_checkins: {
    client_id: string;
    user_id: string;
    habit_client_id: string;
    checked_on: string;
  };
};

export type RemotePatchPayloadByResource = {
  [R in DataResource]: Partial<
    Omit<RemoteInsertPayloadByResource[R], "client_id" | "user_id">
  >;
};

type RemoteIdentity = {
  userId: string;
  clientId: string;
};

type RemotePayloadContract<R extends DataResource> = {
  insert: (
    identity: RemoteIdentity,
    changes: DataByResource[R],
  ) => RemoteInsertPayloadByResource[R];
  patch: (
    changes: Partial<DataByResource[R]>,
  ) => RemotePatchPayloadByResource[R];
  persistedChangeKeys: readonly (keyof DataByResource[R])[];
};

type RemotePayloadContracts = {
  [R in DataResource]: RemotePayloadContract<R>;
};

const REMOTE_PAYLOAD_CONTRACTS = {
  profiles: {
    insert: ({ userId }, changes) => ({
      user_id: userId,
      username: changes.username || null,
      preferred_language: changes.preferredLanguage,
      accent_color: changes.accentColor,
      color_scheme: changes.colorScheme,
      completed_goal_retention: changes.completedGoalRetention,
      week_starts_on: changes.weekStartsOn,
    }),
    patch: (changes) => ({
      ...(Object.hasOwn(changes, "username")
        ? { username: changes.username || null }
        : {}),
      ...(Object.hasOwn(changes, "preferredLanguage")
        ? { preferred_language: changes.preferredLanguage }
        : {}),
      ...(Object.hasOwn(changes, "accentColor")
        ? { accent_color: changes.accentColor }
        : {}),
      ...(Object.hasOwn(changes, "colorScheme")
        ? { color_scheme: changes.colorScheme }
        : {}),
      ...(Object.hasOwn(changes, "completedGoalRetention")
        ? { completed_goal_retention: changes.completedGoalRetention }
        : {}),
      ...(Object.hasOwn(changes, "weekStartsOn")
        ? { week_starts_on: changes.weekStartsOn }
        : {}),
    }),
    persistedChangeKeys: [
      "username",
      "preferredLanguage",
      "accentColor",
      "colorScheme",
      "completedGoalRetention",
      "weekStartsOn",
    ],
  },
  moments: {
    insert: ({ userId, clientId }, changes) => ({
      client_id: clientId,
      user_id: userId,
      content: changes.content,
      occurred_on: changes.occurredOn,
      image_path: changes.imagePath,
    }),
    patch: (changes) => ({
      ...(Object.hasOwn(changes, "content")
        ? { content: changes.content }
        : {}),
      ...(Object.hasOwn(changes, "occurredOn")
        ? { occurred_on: changes.occurredOn }
        : {}),
      ...(Object.hasOwn(changes, "imagePath")
        ? { image_path: changes.imagePath }
        : {}),
    }),
    persistedChangeKeys: ["content", "occurredOn", "imagePath"],
  },
  reflections: {
    insert: ({ userId, clientId }, changes) => ({
      client_id: clientId,
      user_id: userId,
      title: changes.title,
      body: changes.body,
    }),
    patch: (changes) => ({
      ...(Object.hasOwn(changes, "title") ? { title: changes.title } : {}),
      ...(Object.hasOwn(changes, "body") ? { body: changes.body } : {}),
    }),
    persistedChangeKeys: ["title", "body"],
  },
  goals: {
    insert: ({ userId, clientId }, changes) => ({
      client_id: clientId,
      user_id: userId,
      title: changes.title,
      description: changes.description,
      due_date: changes.dueDate,
      completed_at: changes.completedAt,
      color: changes.color,
      sort_order: changes.sortOrder,
    }),
    patch: (changes) => ({
      ...(Object.hasOwn(changes, "title") ? { title: changes.title } : {}),
      ...(Object.hasOwn(changes, "description")
        ? { description: changes.description }
        : {}),
      ...(Object.hasOwn(changes, "dueDate")
        ? { due_date: changes.dueDate }
        : {}),
      ...(Object.hasOwn(changes, "completedAt")
        ? { completed_at: changes.completedAt }
        : {}),
      ...(Object.hasOwn(changes, "color") ? { color: changes.color } : {}),
      ...(Object.hasOwn(changes, "sortOrder")
        ? { sort_order: changes.sortOrder }
        : {}),
    }),
    persistedChangeKeys: [
      "title",
      "description",
      "dueDate",
      "completedAt",
      "color",
      "sortOrder",
    ],
  },
  habits: {
    insert: ({ userId, clientId }, changes) => ({
      client_id: clientId,
      user_id: userId,
      name: changes.name,
      description: changes.description,
      frequency: changes.frequency,
      color: changes.color,
      started_on: changes.startedOn,
    }),
    patch: (changes) => ({
      ...(Object.hasOwn(changes, "name") ? { name: changes.name } : {}),
      ...(Object.hasOwn(changes, "description")
        ? { description: changes.description }
        : {}),
      ...(Object.hasOwn(changes, "frequency")
        ? { frequency: changes.frequency }
        : {}),
      ...(Object.hasOwn(changes, "color") ? { color: changes.color } : {}),
      ...(Object.hasOwn(changes, "startedOn")
        ? { started_on: changes.startedOn }
        : {}),
    }),
    persistedChangeKeys: [
      "name",
      "description",
      "frequency",
      "color",
      "startedOn",
    ],
  },
  habit_checkins: {
    insert: ({ userId, clientId }, changes) => ({
      client_id: clientId,
      user_id: userId,
      habit_client_id: changes.habitClientId,
      checked_on: changes.checkedOn,
    }),
    patch: (changes) => ({
      ...(Object.hasOwn(changes, "habitClientId")
        ? { habit_client_id: changes.habitClientId }
        : {}),
      ...(Object.hasOwn(changes, "checkedOn")
        ? { checked_on: changes.checkedOn }
        : {}),
    }),
    persistedChangeKeys: ["habitClientId", "checkedOn"],
  },
} satisfies RemotePayloadContracts;

function contractFor<R extends DataResource>(
  resource: R,
): RemotePayloadContract<R> {
  // TypeScript does not preserve the key/value correlation of a generic mapped
  // type lookup. The object above is checked exhaustively before this cast.
  return REMOTE_PAYLOAD_CONTRACTS[
    resource
  ] as unknown as RemotePayloadContract<R>;
}

export function buildRemoteInsertPayload<R extends DataResource>(
  resource: R,
  identity: RemoteIdentity,
  changes: DataByResource[R],
): RemoteInsertPayloadByResource[R] {
  return contractFor(resource).insert(identity, changes);
}

export function buildRemotePatchPayload<R extends DataResource>(
  resource: R,
  changes: Partial<DataByResource[R]>,
): RemotePatchPayloadByResource[R] {
  return contractFor(resource).patch(changes);
}

export function persistedChangeKeysFor<R extends DataResource>(
  resource: R,
): readonly (keyof DataByResource[R])[] {
  return contractFor(resource).persistedChangeKeys;
}
