import type {
  AnyConflictDetails,
  ConflictFieldSource,
  DataResource,
  MutationBlobRecord,
} from "../../../../lib/data-v2";

type FieldKind =
  | "text"
  | "multiline"
  | "number"
  | "date"
  | "datetime"
  | "enum"
  | "reference"
  | "image";

type FieldSpec = {
  key: string;
  en: string;
  zh: string;
  kind: FieldKind;
  nullable?: boolean;
  required?: boolean;
  options?: readonly string[];
};

const FIELD_SPECS = {
  profiles: [
    { key: "username", en: "Display name", zh: "显示名称", kind: "text" },
    {
      key: "preferredLanguage",
      en: "Language",
      zh: "语言",
      kind: "enum",
      options: ["zh", "en"],
    },
    {
      key: "accentColor",
      en: "Accent color",
      zh: "强调色",
      kind: "enum",
      options: ["sage", "green", "purple", "amber"],
    },
    {
      key: "colorScheme",
      en: "Color scheme",
      zh: "外观模式",
      kind: "enum",
      options: ["system", "light", "dark"],
    },
    {
      key: "completedGoalRetention",
      en: "Completed goals",
      zh: "完成目标保留",
      kind: "enum",
      options: ["instant", "next_day", "never"],
    },
    {
      key: "weekStartsOn",
      en: "Week starts on",
      zh: "每周起始日",
      kind: "enum",
      options: ["auto", "monday", "sunday", "saturday"],
    },
  ],
  moments: [
    {
      key: "content",
      en: "Content",
      zh: "内容",
      kind: "multiline",
      required: true,
    },
    {
      key: "occurredOn",
      en: "Date",
      zh: "日期",
      kind: "date",
      required: true,
    },
    {
      key: "imagePath",
      en: "Image",
      zh: "图片",
      kind: "image",
      nullable: true,
    },
  ],
  reflections: [
    {
      key: "title",
      en: "Title",
      zh: "标题",
      kind: "text",
      required: true,
    },
    {
      key: "body",
      en: "Body",
      zh: "正文",
      kind: "multiline",
      required: true,
    },
  ],
  goals: [
    {
      key: "title",
      en: "Title",
      zh: "标题",
      kind: "text",
      required: true,
    },
    {
      key: "description",
      en: "Description",
      zh: "描述",
      kind: "multiline",
    },
    {
      key: "dueDate",
      en: "Due date",
      zh: "截止日期",
      kind: "date",
      nullable: true,
    },
    {
      key: "completedAt",
      en: "Completed at",
      zh: "完成时间",
      kind: "datetime",
      nullable: true,
    },
    { key: "color", en: "Color", zh: "颜色", kind: "text", nullable: true },
    { key: "sortOrder", en: "Order", zh: "排序", kind: "number" },
  ],
  habits: [
    {
      key: "name",
      en: "Name",
      zh: "名称",
      kind: "text",
      required: true,
    },
    {
      key: "description",
      en: "Description",
      zh: "描述",
      kind: "multiline",
      nullable: true,
    },
    {
      key: "frequency",
      en: "Frequency",
      zh: "频率",
      kind: "enum",
      options: ["daily", "weekly"],
    },
    { key: "color", en: "Color", zh: "颜色", kind: "text", nullable: true },
    {
      key: "startedOn",
      en: "Start date",
      zh: "开始日期",
      kind: "date",
      required: true,
    },
  ],
  habit_checkins: [
    {
      key: "habitClientId",
      en: "Habit",
      zh: "习惯",
      kind: "reference",
      required: true,
    },
    {
      key: "checkedOn",
      en: "Check-in date",
      zh: "打卡日期",
      kind: "date",
      required: true,
    },
  ],
} as const satisfies Record<DataResource, readonly FieldSpec[]>;

export type ConflictField = {
  key: string;
  local: unknown;
  remote: unknown;
  differs: boolean;
  changedLocally: boolean;
  pendingBlob: MutationBlobRecord | null;
  spec: FieldSpec;
};

export type ConflictMergeDraft = {
  values: Record<string, unknown>;
  sources: Record<string, ConflictFieldSource>;
};

export type ConflictMergeValidation = {
  valid: boolean;
  changes: Record<string, unknown>;
  errors: Record<string, "required" | "date" | "datetime" | "number" | "enum">;
};

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function conflictFields(details: AnyConflictDetails): ConflictField[] {
  const local = details.local as unknown as Record<string, unknown>;
  const remote = details.remote as unknown as Record<string, unknown> | null;
  const changes = details.changes as Record<string, unknown> | null;
  const pendingImage =
    details.blobs.find((blob) => blob.slot === "image") ?? null;
  return FIELD_SPECS[details.resource].map((spec) => ({
    key: spec.key,
    local: local[spec.key],
    remote: remote?.[spec.key],
    differs:
      !Object.is(local[spec.key], remote?.[spec.key]) ||
      (spec.kind === "image" && pendingImage !== null),
    changedLocally:
      details.kind === "create" ||
      (details.kind === "patch" &&
        Boolean(changes && Object.hasOwn(changes, spec.key))),
    pendingBlob: spec.kind === "image" ? pendingImage : null,
    spec,
  }));
}

export function conflictFieldLabel(key: string, language: "en" | "zh") {
  for (const specs of Object.values(FIELD_SPECS)) {
    const match = specs.find((spec) => spec.key === key);
    if (match) return match[language];
  }
  return key;
}

export function createMergeDraft(
  details: AnyConflictDetails,
): ConflictMergeDraft {
  const fields = conflictFields(details);
  const entries = fields.map((field) => {
    const source: ConflictFieldSource =
      details.remote && !field.changedLocally ? "remote" : "local";
    return [
      field.key,
      source,
      source === "remote" ? field.remote : field.local,
    ] as const;
  });
  return {
    values: Object.fromEntries(entries.map(([key, , value]) => [key, value])),
    sources: Object.fromEntries(entries.map(([key, source]) => [key, source])),
  };
}

export function chooseConflictValue(
  draft: ConflictMergeDraft,
  field: ConflictField,
  source: "local" | "remote",
) {
  return {
    values: {
      ...draft.values,
      [field.key]: source === "local" ? field.local : field.remote,
    },
    sources: { ...draft.sources, [field.key]: source },
  };
}

export function editConflictValue(
  draft: ConflictMergeDraft,
  key: string,
  rawValue: string,
) {
  return {
    values: { ...draft.values, [key]: rawValue },
    sources: { ...draft.sources, [key]: "custom" as const },
  };
}

export function validateConflictMerge(
  details: AnyConflictDetails,
  draft: ConflictMergeDraft,
): ConflictMergeValidation {
  const changes: Record<string, unknown> = {};
  const errors: ConflictMergeValidation["errors"] = {};
  for (const field of conflictFields(details)) {
    const { spec } = field;
    let value = draft.values[field.key];
    if (typeof value === "string" && spec.kind !== "image")
      value = value.trim();
    if (value === "" && spec.nullable) value = null;
    if (
      (value === null || value === undefined || value === "") &&
      spec.required
    ) {
      errors[field.key] = "required";
      continue;
    }
    if (value === null && spec.nullable) {
      changes[field.key] = null;
      continue;
    }
    if (spec.kind === "number") {
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) {
        errors[field.key] = "number";
        continue;
      }
      value = parsed;
    } else if (spec.kind === "date" && !isValidDate(String(value))) {
      errors[field.key] = "date";
      continue;
    } else if (
      spec.kind === "datetime" &&
      (typeof value !== "string" || Number.isNaN(new Date(value).getTime()))
    ) {
      errors[field.key] = "datetime";
      continue;
    } else if (
      spec.kind === "enum" &&
      !spec.options?.includes(value as never)
    ) {
      errors[field.key] = "enum";
      continue;
    }
    changes[field.key] = value;
  }
  return { valid: Object.keys(errors).length === 0, changes, errors };
}

export function conflictValidationMessage(
  error: ConflictMergeValidation["errors"][string],
  language: "en" | "zh",
) {
  const messages = {
    required: { en: "A value is required.", zh: "此字段不能为空。" },
    date: { en: "Enter a valid date.", zh: "请输入有效日期。" },
    datetime: {
      en: "Enter a valid date and time.",
      zh: "请输入有效日期和时间。",
    },
    number: { en: "Enter a valid number.", zh: "请输入有效数字。" },
    enum: { en: "Choose a valid option.", zh: "请选择有效选项。" },
  } as const;
  return error ? messages[error][language] : "";
}

export function conflictFieldAllowsCustomValue(field: ConflictField) {
  return field.spec.kind !== "image" && field.spec.kind !== "reference";
}

export function conflictFieldInput(field: ConflictField) {
  return {
    kind: field.spec.kind,
    options: field.spec.options ?? [],
  };
}

export function formatConflictValue(
  value: unknown,
  language: "en" | "zh",
  pendingBlob?: MutationBlobRecord | null,
) {
  if (pendingBlob) {
    return language === "en"
      ? `Pending upload: ${pendingBlob.fileName}`
      : `待上传：${pendingBlob.fileName}`;
  }
  if (value === undefined) return language === "en" ? "Deleted" : "已删除";
  if (value === null || value === "") return language === "en" ? "Empty" : "空";
  if (typeof value === "boolean") {
    return value
      ? language === "en"
        ? "Yes"
        : "是"
      : language === "en"
        ? "No"
        : "否";
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function draftInputValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}
