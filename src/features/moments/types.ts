import type { LocalFirstEntity } from "../../lib/localFirst/types";

export type MomentRecord = LocalFirstEntity & {
  content: string;
  local_file?: File | Blob | null;
  local_file_name?: string | null;
  previous_image_path?: string | null;
};

export type CreateMomentInput = {
  id?: number;
  client_id?: string;
  content: string;
  created_at?: string;
  image_path?: string | null;
  image_url?: string | null;
  local_file?: File | Blob | null;
  local_file_name?: string | null;
  previous_image_path?: string | null;
  date?: string;
};

export type UpdateMomentInput = Partial<
  Pick<
    MomentRecord,
    | "content"
    | "created_at"
    | "image_path"
    | "image_url"
    | "local_file"
    | "local_file_name"
    | "previous_image_path"
  >
>;
