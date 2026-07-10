import type { ReflectionEntity } from "../../domain/entities";

export type ReflectionRecord = ReflectionEntity;

export type CreateReflectionInput = {
  clientId?: string;
  title: string;
  body: string;
};

export type UpdateReflectionInput = Partial<
  Pick<ReflectionRecord, "title" | "body">
>;
