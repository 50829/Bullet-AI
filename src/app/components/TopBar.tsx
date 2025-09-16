"use client";
import React from "react";

interface TopBarProps {
  lang: "zh" | "en";
  onChangeLang: (l: "zh" | "en") => void;
  currentView: "today" | "future";
  onChangeView: (v: "today" | "future") => void;
  onAddTask: () => void;
  showAdd: boolean;
  t: Record<string, string | string[]>;
}

/* 顶部栏：
 * - 左侧：语言切换
 * - 右侧：视图切换 + 添加按钮（仅 today）
 * - 移动端：允许换行，上下两行自然流式
 */
export const TopBar: React.FC<TopBarProps> = ({
  lang,
  onChangeLang,
  currentView,
  onChangeView,
  onAddTask,
  showAdd,
  t,
}) => {
  const baseBtn =
    "px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent";
  const active = "bg-[var(--brand-color)] text-white";
  const inactive =
    "bg-white text-gray-700 hover:bg-gray-100";

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-4 mb-6">
      {/* Language Switch */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChangeLang("zh")}
          className={`${baseBtn} ${lang === "zh" ? active : inactive}`}
        >
          中文
        </button>
        <button
          onClick={() => onChangeLang("en")}
          className={`${baseBtn} ${lang === "en" ? active : inactive}`}
        >
          English
        </button>
      </div>
      {/* View Switch */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChangeView("today")}
          className={`${baseBtn} ${
            currentView === "today" ? active : inactive
          }`}
        >
          {t.today as string}
        </button>
        <button
          onClick={() => onChangeView("future")}
          className={`${baseBtn} ${
            currentView === "future" ? active : inactive
          }`}
        >
          {t.future as string}
        </button>
        {showAdd && (
          <button
            onClick={onAddTask}
            className={`${baseBtn} bg-[var(--brand-color)] text-white hover:opacity-90`}
          >
            {t.addTask as string}
          </button>
        )}
      </div>
    </div>
  );
};
