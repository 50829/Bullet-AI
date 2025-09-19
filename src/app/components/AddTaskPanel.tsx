// src/components/AddTaskPanel.tsx
import { useState } from 'react';
import { Task } from '../types';

interface Props {
  onClose: () => void;
  onConfirm: (task: Partial<Task>) => void;
  t: Record<string, string>;
}

export function AddTaskPanel({ onClose, onConfirm, t }: Props) {
  /* ---------- 初始状态：时间全部为 null ---------- */
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
    startDate: null,
    dueDate: null,
    isCompleted: false,
  });
  const [newTag, setNewTag] = useState('');

  /* ---------- 时间工具 ---------- */
  const fmt = (d: Date | null): string => {
    if (!d) return '';
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const parse = (time: string): Date | null => {
    if (!time) return null;          // 用户清空时立即变 null
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  /* ---------- 确认 ---------- */
  const handleConfirm = () => {
    if (!newTask.title?.trim()) return;
    onConfirm(newTask);
  };

  /* ---------- 渲染 ---------- */
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="font-bold mb-4">{t.add}</h3>

        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium">{t.noTitle}</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              maxLength={50}
            />
            <p className="text-sm text-gray-500">{(newTask.title || '').length}/50</p>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium">{t.description}</label>
            <textarea
              className="w-full border rounded p-2"
              value={newTask.description || ''}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium">{t.priority}</label>
            <select
              className="w-full border rounded p-2"
              value={newTask.priority}
              onChange={(e) =>
                setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })
              }
            >
              <option value="low">{t.low}</option>
              <option value="medium">{t.medium}</option>
              <option value="high">{t.high}</option>
            </select>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium">{t.tags}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(newTask.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs flex items-center"
                >
                  {tag}
                  <button
                    onClick={() =>
                      setNewTask({
                        ...newTask,
                        tags: (newTask.tags || []).filter((tg) => tg !== tag),
                      })
                    }
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
                placeholder={t.addTag}
              />
              <button
                onClick={() => {
                  if (newTag.trim()) {
                    setNewTask({ ...newTask, tags: [...(newTask.tags || []), newTag.trim()] });
                    setNewTag('');
                  }
                }}
                className="bg-[var(--brand-color)] text-white px-4 rounded-r"
              >
                +
              </button>
            </div>
          </div>

          {/* 时间：开始 / 截止 */}
          <div>
            <label className="block text-sm font-medium">{t.timeSetting}</label>
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-xs">{t.startTime}</label>
                <input
                  type="time"
                  className="w-full border rounded p-2"
                  value={fmt(newTask.startDate)}      // 初始必为空串
                  onChange={(e) =>
                    setNewTask({ ...newTask, startDate: parse(e.target.value) })
                  }
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs">{t.endTime}</label>
                <input
                  type="time"
                  className="w-full border rounded p-2"
                  value={fmt(newTask.dueDate)}        // 初始必为空串
                  onChange={(e) =>
                    setNewTask({ ...newTask, dueDate: parse(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-2 mt-4">
            <button onClick={onClose} className="px-4 py-2 border rounded text-gray-600">
              {t.cancel}
            </button>
            <button onClick={handleConfirm} className="px-4 py-2 bg-[var(--brand-color)] text-white rounded">
              {t.addTask}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}