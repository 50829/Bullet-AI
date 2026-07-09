"use client";

import { Edit2, Trash2 } from "lucide-react";
import { PlainImage } from "../../components/ui/PlainImage";
import { ActionButtonGroup } from "../../components/ui/ActionButtonGroup";
import { IconButton } from "../../components/ui/IconButton";
import { useLanguage } from "../../context/LanguageContext";
import type { MomentRecord as Moment } from "../../../features/workspace/types";

type MomentEntryCardProps = {
  moment: Moment;
  highlighted: boolean;
  entryTime: string;
  onEdit: (moment: Moment) => void;
  onDelete: (moment: Moment) => void;
};

export function MomentEntryCard({
  moment,
  highlighted,
  entryTime,
  onEdit,
  onDelete,
}: MomentEntryCardProps) {
  const { t } = useLanguage();

  return (
    <div
      id={`moment-${moment.id}`}
      className={`group/item relative overflow-hidden rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-4 py-4 shadow-sm transition-[background-color,box-shadow,border-color] duration-700 ease-out hover:border-[var(--color-border)] motion-reduce:transition-none ${
        highlighted
          ? "bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]"
          : ""
      }`}
    >
      <ActionButtonGroup className="absolute right-3 top-3 z-10 rounded-lg bg-[var(--color-bg-surface)]/90 opacity-100 shadow-sm transition-opacity duration-150 focus-within:opacity-100 group-hover/item:opacity-100 sm:opacity-0 motion-reduce:transition-none">
        <IconButton
          icon={<Edit2 size={17} />}
          label={t("edit") || "编辑"}
          tone="primary"
          size="sm"
          onClick={() => onEdit(moment)}
        />
        <IconButton
          icon={<Trash2 size={17} />}
          label={t("delete") || "删除"}
          tone="danger"
          size="sm"
          onClick={() => onDelete(moment)}
        />
      </ActionButtonGroup>

      {moment.content && (
        <p className="whitespace-pre-line pr-20 text-[17px] leading-8 text-[var(--color-text-primary)]">
          {moment.content}
        </p>
      )}

      {moment.image_url && (
        <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)]">
          <PlainImage
            src={moment.image_url}
            alt="时刻图片"
            className="h-auto max-h-[520px] w-full object-cover"
          />
        </div>
      )}

      <div className="mt-4 text-xs text-[var(--color-text-secondary)]">
        {entryTime}
      </div>
    </div>
  );
}
