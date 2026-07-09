export type LocalFirstMeta = {
  _local?: {
    pending?: boolean;
    failed?: boolean;
    deleted?: boolean;
  };
  client_id?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type LocalFirstEntity = LocalFirstMeta & {
  id: number;
  user_id?: string;
  created_at: string;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};
