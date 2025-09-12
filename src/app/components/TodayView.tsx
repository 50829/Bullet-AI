// src/components/TodayView.tsx
import { Task } from '../types';
import { TaskStats } from './TaskStats';
import { AIAssistant } from './AIAssistant';
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
import { useMemo } from 'react';

interface TodayViewProps {
  todayTasks: Task[];
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
}

export function TodayView({ todayTasks, tasks, setTasks }: TodayViewProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  /* ---- 统计 ---- */
  const now = new Date();
  const overdueCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          !t.isCompleted && t.dueDate && t.dueDate.getTime() < now.getTime()
      ).length,
    [tasks, now]
  );
  const completedCount = todayTasks.filter((t) => t.isCompleted).length;

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
      const otherTasks = tasks.filter((t) => !todayTasks.some((tt) => tt.id === t.id));
      setTasks([...reorderedToday, ...otherTasks]);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          今日任务{' '}
          {new Date().toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            weekday: 'long',
          })}
        </h1>
        <p className="text-gray-500">专注当下，高效执行</p>
      </div>

      <TaskStats
        total={todayTasks.length}
        completed={completedCount}
        pending={todayTasks.length - completedCount}
        overdue={overdueCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
          {todayTasks.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={todayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {todayTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <TaskItem
                        task={task}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                      />
                      {/* 迁移按钮 */}
                      <button
                        onClick={() => handleMigrate(task.id)}
                        className="ml-3 px-3 py-1.5 text-sm font-semibold rounded-lg
                          bg-gradient-to-r from-indigo-400 to-indigo-500 text-white
                          shadow-md hover:shadow-lg active:brightness-95
                          transition-all duration-200"
                      >
                        迁移
                      </button>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <FileEdit className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">暂无任务</h3>
              <p className="mt-1 text-sm">今天还没有安排任务，点击上方按钮开始创建</p>
            </div>
          )}
        </div>

        <AIAssistant tasks={tasks} />
      </div>
    </div>
  );
}