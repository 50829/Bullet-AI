import type { MomentEntity } from "../../domain/entities";

export type MomentRecord = MomentEntity & {
  imageUrl: string | null;
};

export type CreateMomentInput = {
  clientId?: string;
  content: string;
  occurredOn: string;
  imagePath?: string | null;
  imageFile?: File | Blob | null;
  imageFileName?: string | null;
};

export type UpdateMomentInput = Partial<
  Pick<MomentRecord, "content" | "occurredOn" | "imagePath">
> & {
  imageFile?: File | Blob | null;
  imageFileName?: string | null;
};
