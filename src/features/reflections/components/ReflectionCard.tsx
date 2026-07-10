"use client";

import { ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";
import { ActionButtonGroup } from "../../../shared/components/ui/ActionButtonGroup";
import { Card } from "../../../shared/components/ui/Card";
import { IconButton } from "../../../shared/components/ui/IconButton";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import type { ReflectionRecord as Reflection } from "../types";

type ReflectionCardProps = {
  reflection: Reflection;
  collapsed: boolean;
  highlighted: boolean;
  onToggle: (reflectionId: string) => void;
  onEdit: (reflection: Reflection) => void;
  onDelete: (reflection: Reflection) => void;
};

export function ReflectionCard({
  reflection,
  collapsed,
  highlighted,
  onToggle,
  onEdit,
  onDelete,
}: ReflectionCardProps) {
  const { t, language } = useLanguage();

  return (
    <Card
      id={`reflection-${reflection.clientId}`}
      className={`group/item relative w-full transition-[background-color,box-shadow] duration-700 ease-out motion-reduce:transition-none ${
        highlighted
          ? "bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]"
          : ""
      }`}
    >
      <ActionButtonGroup variant="overlay" visibility="hover" hoverScope="item">
        <IconButton
          icon={<Edit2 size={18} />}
          label={t("edit") || "编辑"}
          tone="primary"
          size="sm"
          onClick={() => onEdit(reflection)}
        />
        <IconButton
          icon={<Trash2 size={18} />}
          label={t("delete") || "删除"}
          tone="danger"
          size="sm"
          onClick={() => onDelete(reflection)}
        />
      </ActionButtonGroup>

      <div className="flex items-start gap-3">
        <IconButton
          icon={collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          label={collapsed ? "Expand reflection" : "Collapse reflection"}
          tone="neutral"
          onClick={() => onToggle(reflection.clientId)}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-20">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {reflection.title || t("insights") || "感悟"}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {new Date(reflection.updatedAt).toLocaleString(
                  language === "en" ? "en-US" : "zh-CN",
                )}
              </p>
            </div>
            {(reflection.sync?.blocked || reflection.sync?.conflict) && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                {t("syncFailed") || "同步失败"}
              </span>
            )}
          </div>
          {!collapsed && (
            <p className="mt-4 whitespace-pre-line text-base leading-7 text-[var(--color-text-primary)]">
              {reflection.body}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
