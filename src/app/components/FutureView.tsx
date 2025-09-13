// src/components/FutureView.tsx
import { Task } from '../types';
import { MigrationList } from './MigrationList';
import { Calendar } from './Calendar';
import { ScheduledTasks } from './ScheduledTasks'; // 新增
import { AIAssistant } from './AIAssistant';
import { TaskStats } from './TaskStats';
import { useState } from 'react';
import { AddTaskPanel } from './AddTaskPanel';

interface FutureViewProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  futureTasks: Task[];
  migrationListTasks: Task[];
}

export function FutureView({
  tasks,
  setTasks,
  futureTasks,
  migrationListTasks,
}: FutureViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    // 默认选中今天
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const completedCount = futureTasks.filter((t) => t.isCompleted).length;

  const handleAddTask = (partial: Partial<Task>) => {
    const task: Task = {
      id: Date.now().toString(),
      title: partial.title || '',
      description: partial.description,
      priority: partial.priority || 'medium',
      tags: partial.tags || [],
      startDate: partial.startDate || null,
      dueDate: null,
      isCompleted: false,
      createdAt: new Date(),
    };
    setTasks([...tasks, task]);
    setIsAdding(false);
  };

  /* 把任务移动到选中日期 */
  const handleMoveTask = (taskId: string) => {
    if (!selectedDate) return;
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, dueDate: selectedDate } : t))
    );
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">未来规划</h1>
          <p className="text-gray-500">提前布局，掌控节奏</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600"
        >
          + 添加任务
        </button>
      </div>

      <TaskStats
        total={futureTasks.length + migrationListTasks.length}
        completed={completedCount}
        pending={futureTasks.length + migrationListTasks.length - completedCount}
        overdue={0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-6">
          {/* 迁移列表 */}
          <MigrationList
            tasks={tasks}
            setTasks={setTasks}
            migrationTasks={migrationListTasks}
            onMove={handleMoveTask}
            selectedDate={selectedDate}
          />

          {/* 日历 */}
          <Calendar
            tasks={tasks}
            setTasks={setTasks}
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
          />

          {/* 与选中日期一一对应的「已安排任务」面板 */}
          <ScheduledTasks
            tasks={tasks}
            setTasks={setTasks}
            targetDate={selectedDate}
          />
        </div>

        <AIAssistant
  tasks={tasks}
  onAddTasks={(newTasks) => setTasks([...tasks, ...newTasks])}
/>
      </div>

      {isAdding && (
        <AddTaskPanel
          onClose={() => setIsAdding(false)}
          onConfirm={handleAddTask}
        />
      )}
    </>
  );
}