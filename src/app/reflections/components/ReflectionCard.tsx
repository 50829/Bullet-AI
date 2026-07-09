"use client";

import { ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";
import { parseReflectionContent } from "../../../lib/reflections/reflectionContent";
import { ActionButtonGroup } from "../../components/ui/ActionButtonGroup";
import { Card } from "../../components/ui/Card";
import { IconButton } from "../../components/ui/IconButton";
import { useLanguage } from "../../context/LanguageContext";
import type { ReflectionRecord as Reflection } from "../../../features/workspace/types";

type ReflectionCardProps = {
  reflection: Reflection;
  collapsed: boolean;
  highlighted: boolean;
  onToggle: (reflectionId: number) => void;
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
  const parsed = parseReflectionContent(reflection);

  return (
    <Card
      id={`reflection-${reflection.id}`}
      className={`w-full transition-[background-color,box-shadow] duration-700 ease-out motion-reduce:transition-none ${
        highlighted
          ? "bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]"
          : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <IconButton
          icon={collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          label={collapsed ? "Expand reflection" : "Collapse reflection"}
          tone="neutral"
          onClick={() => onToggle(reflection.id)}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {parsed.title || t("insights") || "感悟"}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {new Date(
                  reflection.updated_at || reflection.created_at,
                ).toLocaleString(language === "en" ? "en-US" : "zh-CN")}
              </p>
            </div>
            <ActionButtonGroup>
              {reflection._local?.failed && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                  {t("syncFailed") || "同步失败"}
                </span>
              )}
              <IconButton
                icon={<Edit2 size={18} />}
                label={t("edit") || "编辑"}
                tone="primary"
                onClick={() => onEdit(reflection)}
              />
              <IconButton
                icon={<Trash2 size={18} />}
                label={t("delete") || "删除"}
                tone="danger"
                onClick={() => onDelete(reflection)}
              />
            </ActionButtonGroup>
          </div>
          {!collapsed && (
            <p className="mt-4 whitespace-pre-line text-base leading-7 text-[var(--color-text-primary)]">
              {parsed.body}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
