import type { SyncStatus } from "../../lib/localDb/types";

export type LocalMeta = {
  _local?: {
    pending?: boolean;
    failed?: boolean;
    deleted?: boolean;
  };
  client_id?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type WorkspaceEntity = LocalMeta & {
  id: number;
  user_id?: string;
  created_at: string;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};

export type MomentRecord = WorkspaceEntity & {
  content: string;
  local_file?: File | Blob | null;
  local_file_name?: string | null;
  previous_image_path?: string | null;
};

export type ReflectionRecord = WorkspaceEntity & {
  content: string;
  title?: string | null;
  body?: string | null;
  source?: string | null;
  source_type?: string | null;
  location?: string | null;
};

export type GoalRecord = WorkspaceEntity & {
  title: string;
  description: string;
  status: string;
  due_date?: string | null;
  progress: number;
  color?: string | null;
  sort_order?: number | null;
};

export type WorkspaceLoadingState = {
  moments: boolean;
  reflections: boolean;
  goals: boolean;
};

export type WorkspaceCollections = {
  moments: MomentRecord[];
  reflections: ReflectionRecord[];
  goals: GoalRecord[];
  loading: WorkspaceLoadingState;
  refreshMoments: () => Promise<void>;
  refreshReflections: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  addMoment: (moment: MomentRecord) => Promise<void>;
  addReflection: (reflection: ReflectionRecord) => Promise<void>;
  addGoal: (goal: GoalRecord) => Promise<void>;
  updateMoment: (
    id: number,
    updates: Partial<MomentRecord>,
  ) => Promise<void>;
  updateReflection: (
    id: number,
    updates: Partial<ReflectionRecord>,
  ) => Promise<void>;
  updateGoal: (id: number, updates: Partial<GoalRecord>) => Promise<void>;
  reorderGoals: (orderedIds: number[]) => Promise<void>;
  deleteMoment: (id: number, imagePath?: string | null) => Promise<void>;
  deleteReflection: (id: number, imagePath?: string | null) => Promise<void>;
  deleteGoal: (id: number, imagePath?: string | null) => Promise<void>;
  exportData: () => string;
};

export type WorkspaceSessionState = {
  userId: string | null;
  syncStatus: SyncStatus;
  retrySync: () => Promise<void>;
};
