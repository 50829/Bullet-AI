// src/components/MigrationList.tsx
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

interface MigrationListProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  migrationTasks: Task[];
  onMove: (taskId: string) => void;
  selectedDate: Date | null;
  t: Record<string, string>;
}

export function MigrationList({
  tasks,
  setTasks,
  migrationTasks,
  onMove,
  selectedDate,
  t,
}: MigrationListProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  /* ---- 任务操作 ---- */
  const handleToggle = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));
  };
  const handleDelete = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };
  const handleUpdate = (id: string, updatedTask: Task) => {
    setTasks(tasks.map((t) => (t.id === id ? updatedTask : t)));
  };

  /* ---- 拖拽排序 ---- */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = migrationTasks.findIndex((t) => t.id === active.id);
      const newIndex = migrationTasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(migrationTasks, oldIndex, newIndex);
      const others = tasks.filter((t) => !migrationTasks.some((mt) => mt.id === t.id));
      setTasks([...others, ...reordered]);
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <h3 className="font-semibold text-lg mb-2">{t.migrateTitle}</h3>
      <p className="text-sm text-gray-500 mb-4">{t.migrateSubtitle}</p>

      <div className="border-2 border-dashed border-gray-200 rounded-lg min-h-[150px]">
        {migrationTasks.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={migrationTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 p-4">
              {migrationTasks.map((task) => (
  <div key={task.id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
    {/* 主内容占满剩余空间 */}
    <div className="flex-1">
      <TaskItem
        task={task}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        t={t}
        defaultDate={selectedDate} 
      />
    </div>

    {/* 固定按钮，不再挤压宽度 */}
    <button
      onClick={() => onMove(task.id)}
      disabled={!selectedDate}
      className="ml-3 px-3 py-1.5 text-sm font-semibold rounded-lg
        bg-[var(--brand-color)] text-white
        shadow-md hover:shadow-lg active:brightness-95
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200"
    >
                      {t.migrateMoveBtn}
                    </button>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center text-gray-400 py-8">
            <FileEdit className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm">{t.migrateEmpty}</p>
          </div>
        )}
      </div>
    </div>
  );
}