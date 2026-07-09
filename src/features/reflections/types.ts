import type { LocalFirstEntity } from "../../lib/localFirst/types";

export type ReflectionRecord = LocalFirstEntity & {
  content: string;
  title?: string | null;
  body?: string | null;
  source?: string | null;
  source_type?: string | null;
  location?: string | null;
};

export type CreateReflectionInput = {
  id?: number;
  client_id?: string;
  content: string;
  title?: string | null;
  body?: string | null;
  source?: string | null;
  source_type?: string | null;
  location?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  created_at?: string;
};

export type UpdateReflectionInput = Partial<
  Pick<
    ReflectionRecord,
    | "content"
    | "title"
    | "body"
    | "source"
    | "source_type"
    | "location"
    | "image_url"
    | "image_path"
  >
>;
