// src/components/ScheduledTasks.tsx
import { Task } from '../types';
import { TaskItem } from './TaskItem';
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
import { format } from 'date-fns';

interface ScheduledTasksProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  targetDate: Date | null;
  t: Record<string, string>;
  lang: 'zh' | 'en';
}

export function ScheduledTasks({ tasks, setTasks, targetDate, t, lang }: ScheduledTasksProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  const dayTasks = targetDate
    ? tasks.filter((t) => t.dueDate && format(t.dueDate, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd'))
    : [];

  const handleToggle = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));
  };
  const handleDelete = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };
  const handleUpdate = (id: string, updatedTask: Task) => {
    setTasks(tasks.map((t) => (t.id === id ? updatedTask : t)));
  };

  /* ---- 迁回今日（dueDate 改为今天）---- */
  const handleMoveToToday = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, dueDate: new Date() } : t)));
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = dayTasks.findIndex((t) => t.id === active.id);
      const newIndex = dayTasks.findIndex((t) => t.id === over.id);
      const reorderedDay = arrayMove(dayTasks, oldIndex, newIndex);
      const otherTasks = tasks.filter((t) => !dayTasks.some((dt) => dt.id === t.id));
      setTasks([...otherTasks, ...reorderedDay]);
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <h3 className="font-semibold text-lg mb-2">
      {targetDate
    ? t.scheduledTitle.replace('{date}', format(targetDate, lang === 'en' ? 'MM/dd' : 'MM月dd日'))
    : '请选择日期'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{t.scheduledSubtitle}</p>

      {dayTasks.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={dayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {dayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <TaskItem
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                  {/* 迁回今日按钮 */}
                  <button
                    onClick={() => handleMoveToToday(task.id)}
                    className="ml-3 px-3 py-1.5 text-sm font-semibold rounded-lg
                      bg-[var(--brand-color)] text-white
                      shadow-md hover:shadow-lg active:brightness-95
                      transition-all duration-200"
                  >
                    {t.scheduledMoveTodayBtn}
                  </button>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <FileEdit className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">{t.scheduledEmptyTitle}</h3>
          <p className="mt-1 text-sm">{t.scheduledEmptyHint}</p>
        </div>
      )}
    </div>
  );
}