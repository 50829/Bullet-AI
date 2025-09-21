import { Task } from '../types';
import { TaskStats } from './TaskStats';
import { AIAssistant } from './AIAssistant';
import { TaskItem } from './TaskItem';
import { AIAssistantProps } from './AIAssistant';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FileEdit } from 'lucide-react';
import { useMemo } from 'react';

interface TodayViewProps {
  todayTasks: Task[];
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  t: Record<string, string>;
  lang: 'zh' | 'en';
}

export function TodayView({
  todayTasks,
  tasks,
  setTasks,
  t,
  lang,
}: TodayViewProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  /* ---- 统计 ---- */
  const now = new Date();
  const overdueCount = useMemo(
    () =>
      tasks.filter((t) => {
        // 只统计今日任务
        const isTodayTask = todayTasks.some(todayTask => todayTask.id === t.id);
        if (!isTodayTask) return false;
        
        if (t.isCompleted) return false;
        if (!t.dueDate) return false; // 🔥 没有截止时间的任务不算逾期
        
        const dueDate = new Date(t.dueDate);
        // 对于 00:00 的任务，按整天计算
        if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
          const endOfDay = new Date(dueDate);
          endOfDay.setHours(23, 59, 59, 999);
          return endOfDay.getTime() < now.getTime();
        }
        return dueDate.getTime() < now.getTime();
      }).length,
    [tasks, todayTasks, now]
  );
  const completedCount = todayTasks.filter((t) => t.isCompleted).length;

  /* ---- 任务操作 ---- */
  const handleToggle = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };
  const handleDelete = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };
  const handleUpdate = (id: string, updatedTask: Task) => {
    setTasks(tasks.map((t) => (t.id === id ? updatedTask : t)));
  };

  /* ---- 迁移到迁移列表（dueDate 置 null）---- */
  const handleMigrate = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, dueDate: null } : t)));
  };

  /* ---- 拖拽排序 ---- */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = todayTasks.findIndex((t) => t.id === active.id);
      const newIndex = todayTasks.findIndex((t) => t.id === over.id);
      const reorderedToday = arrayMove(todayTasks, oldIndex, newIndex);
      const otherTasks = tasks.filter(
        (t) => !todayTasks.some((tt) => tt.id === t.id)
      );
      setTasks([...reorderedToday, ...otherTasks]);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {t.todayTitle}{' '}
          {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', {
            month: '2-digit',
            day: '2-digit',
            weekday: 'long',
          })}
        </h1>
        <p className="text-gray-500">{t.todaySubtitle}</p>
      </div>

      <TaskStats
        total={todayTasks.length}
        completed={completedCount}
        pending={todayTasks.length - completedCount}
        overdue={overdueCount}
        t={t}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
          {todayTasks.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={todayTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 p-4">
                  {todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-gray-100 p-2 rounded"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <TaskItem
                            task={task}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            onUpdate={handleUpdate}
                            t={t}
                            // 🔥 关键修改：不设置默认时间
                            defaultDate={null}
                          />
                        </div>
                        {/* 迁移按钮 - 桌面端在右侧 */}
                        <button
                          onClick={() => handleMigrate(task.id)}
                          className="ml-3 px-3 py-1.5 text-sm font-semibold rounded-lg
                            bg-[var(--brand-color)] text-white whitespace-nowrap
                            shadow-md hover:shadow-lg active:brightness-95
                            transition-all duration-200
                            hidden sm:block"
                        >
                          {t.migrateBtn}
                        </button>
                      </div>
                      {/* 迁移按钮 - 移动端在下方 */}
                      <button
                        onClick={() => handleMigrate(task.id)}
                        className="w-full mt-2 px-3 py-1.5 text-sm font-semibold rounded-lg
                          bg-[var(--brand-color)] text-white whitespace-nowrap
                          shadow-md hover:shadow-lg active:brightness-95
                          transition-all duration-200
                          sm:hidden"
                      >
                        {t.migrateBtn}
                      </button>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <FileEdit className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">{t.noTask}</h3>
              <p className="mt-1 text-sm">{t.noTaskHint}</p>
            </div>
          )}
        </div>

        <AIAssistant
          tasks={tasks}
          onAddTasks={(newTasks) => setTasks([...tasks, ...newTasks])}
          t={t as unknown as AIAssistantProps['t']}
        />
      </div>
    </div>
  );
}