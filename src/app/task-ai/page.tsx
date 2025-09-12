// src/app/task-ai/page.tsx
'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { TodayView } from '../components/TodayView';
import { FutureView } from '../components/FutureView';
import { Task } from '../types';
import { isToday, isFuture } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';

const initialTasks: Task[] = [];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [currentView, setCurrentView] = useState<'today' | 'future'>('today');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
    startDate: null,
    dueDate: new Date(),
    isCompleted: false,
  });
  const [newTag, setNewTag] = useState('');

  /* ========== 实时订阅：只收别人/别的设备的变更 ========== */
  const skipNext = useRef(false); // 本地写操作后跳过一次监听

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const userId = user.id;

      // 初次全量拉取
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        const dbTasks: Task[] = data.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          priority: row.priority,
          tags: row.tags,
          startDate: row.start_date ? new Date(row.start_date) : null,
          dueDate: row.due_date ? new Date(row.due_date) : null,
          isCompleted: row.is_completed,
          createdAt: new Date(row.created_at),
        }));
        setTasks(dbTasks);
      }

      // 实时监听
      channel = supabase
        .channel('tasks_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (skipNext.current) {
              skipNext.current = false;
              return;
            }
            const { eventType, new: record, old } = payload;
            if (eventType === 'INSERT') {
              const t: Task = {
                id: record.id,
                title: record.title,
                description: record.description,
                priority: record.priority,
                tags: record.tags,
                startDate: record.start_date ? new Date(record.start_date) : null,
                dueDate: record.due_date ? new Date(record.due_date) : null,
                isCompleted: record.is_completed,
                createdAt: new Date(record.created_at),
              };
              setTasks((prev) => [...prev, t]);
            } else if (eventType === 'UPDATE') {
              const t: Task = {
                id: record.id,
                title: record.title,
                description: record.description,
                priority: record.priority,
                tags: record.tags,
                startDate: record.start_date ? new Date(record.start_date) : null,
                dueDate: record.due_date ? new Date(record.due_date) : null,
                isCompleted: record.is_completed,
                createdAt: new Date(record.created_at),
              };
              setTasks((prev) => prev.map((item) => (item.id === t.id ? t : item)));
            } else if (eventType === 'DELETE') {
              setTasks((prev) => prev.filter((item) => item.id !== old.id));
            }
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* ========== 本地写：带防抖 + 跳过监听 ========== */
  const writeDebounce = useRef<NodeJS.Timeout | undefined>(undefined);
  useEffect(() => {
    if (tasks === initialTasks) return; // 初始不写入
    clearTimeout(writeDebounce.current);
    writeDebounce.current = setTimeout(async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const userId = user.id;

      skipNext.current = true; // 让监听跳过本次
      await supabase.from('tasks').delete().eq('user_id', userId);
      if (tasks.length) {
        const rows = tasks.map((t) => ({
          id: t.id,
          user_id: userId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          tags: t.tags,
          start_date: t.startDate,
          due_date: t.dueDate,
          is_completed: t.isCompleted,
          created_at: t.createdAt,
        }));
        await supabase.from('tasks').insert(rows);
      }
    }, 300);
    return () => clearTimeout(writeDebounce.current);
  }, [tasks]);

  /* -------- 任务筛选 -------- */
  const todayTasks = useMemo(() => tasks.filter((t) => t.dueDate && isToday(t.dueDate)), [tasks]);
  const futureTasks = useMemo(() => tasks.filter((t) => t.dueDate && isFuture(t.dueDate)), [tasks]);
  const migrationListTasks = useMemo(() => tasks.filter((t) => t.dueDate === null), [tasks]);

  /* -------- 核心功能函数 -------- */
  const handleAddTask = () => {
    if (!newTask.title) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title || '',
      description: newTask.description,
      priority: newTask.priority || 'medium',
      tags: newTask.tags || [],
      startDate: newTask.startDate || null,
      dueDate: newTask.dueDate,
      isCompleted: false,
      createdAt: new Date(),
    };
    setTasks((prev) => [...prev, task]);
    setIsAddingTask(false);
    setNewTask({ title: '', description: '', priority: 'medium', tags: [], startDate: null, dueDate: new Date(), isCompleted: false });
    setNewTag('');
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((ts) => ts.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== taskId));
  };

  const handleSetTasks = (reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
  };

  /* -------- 时间工具 -------- */
  const getTimeString = (date: Date | null): string => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const setTime = (time: string, isStart: boolean) => {
    if (!time) return;
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date();
    newDate.setHours(hours, minutes, 0, 0);
    if (isStart) {
      setNewTask({ ...newTask, startDate: newDate });
    } else {
      setNewTask({ ...newTask, dueDate: newDate });
    }
  };

  /* -------- 视图渲染 -------- */
  const renderView = () => {
    const commonProps = {
      tasks,
      setTasks,
      onAddTask: handleAddTask,
      onUpdateTask: handleUpdateTask,
      onDeleteTask: handleDeleteTask,
    };
    if (currentView === 'today') {
      return <TodayView todayTasks={todayTasks} {...commonProps} />;
    }
    return <FutureView futureTasks={futureTasks} migrationListTasks={migrationListTasks} {...commonProps} />;
  };

  const renderAddTaskPanel = () => {
    if (!isAddingTask) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="font-bold mb-4">添加新任务</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">任务标题 *</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={newTask.title || ''}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                maxLength={50}
              />
              <p className="text-sm text-gray-500">{(newTask.title || '').length}/50 字符</p>
            </div>
            <div>
              <label className="block text-sm font-medium">任务描述</label>
              <textarea
                className="w-full border rounded p-2"
                value={newTask.description || ''}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">优先级</label>
              <select
                className="w-full border rounded p-2"
                value={newTask.priority || 'medium'}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
              >
                <option value="low">低优先级</option>
                <option value="medium">中优先级</option>
                <option value="high">高优先级</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">标签</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(newTask.tags || []).map((tag) => (
                  <span key={tag} className="bg-gray-200 text-gray-600 px-2 py-1 rounded flex items-center text-xs">
                    {tag}
                    <button
                      onClick={() => setNewTask({ ...newTask, tags: (newTask.tags || []).filter((t) => t !== tag) })}
                      className="ml-1 text-red-500"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  className="flex-grow border rounded-l p-2"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="添加标签"
                />
                <button
                  onClick={() => {
                    if (newTag.trim()) {
                      setNewTask({ ...newTask, tags: [...(newTask.tags || []), newTag.trim()] });
                      setNewTag('');
                    }
                  }}
                  className="bg-blue-500 text-white px-4 rounded-r"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">时间设置</label>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-xs">开始时间</label>
                  <input
                    type="time"
                    className="w-full border rounded p-2"
                    value={getTimeString(newTask.startDate)}
                    onChange={(e) => setTime(e.target.value, true)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs">截止时间</label>
                  <input
                    type="time"
                    className="w-full border rounded p-2"
                    value={getTimeString(newTask.dueDate)}
                    onChange={(e) => setTime(e.target.value, false)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setIsAddingTask(false)} className="px-4 py-2 border rounded text-gray-600">
                取消
              </button>
              <button onClick={handleAddTask} className="px-4 py-2 bg-orange-500 text-white rounded">
                添加任务
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-end space-x-2 mb-6">
          <button
            onClick={() => setCurrentView('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'today' ? 'bg-orange-100 text-orange-600' : 'bg-white hover:bg-gray-100'
            }`}
          >
            今日任务
          </button>
          <button
            onClick={() => setCurrentView('future')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'future' ? 'bg-orange-100 text-orange-600' : 'bg-white hover:bg-gray-100'
            }`}
          >
            未来规划
          </button>
          {currentView === 'today' && (
            <button
              onClick={() => setIsAddingTask(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600"
            >
              + 添加任务
            </button>
          )}
        </div>
        {renderView()}
        {renderAddTaskPanel()}
      </main>
    </div>
  );
}