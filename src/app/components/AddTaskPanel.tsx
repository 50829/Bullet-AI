// src/components/AddTaskPanel.tsx
import { useState } from 'react';
import { Task } from '../types';

interface Props {
  onClose: () => void;
  onConfirm: (task: Partial<Task>) => void;
  t: Record<string, string>;
}

export function AddTaskPanel({ onClose, onConfirm, t }: Props) {
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
    startDate: null,
    dueDate: null,   // 未来视图默认 null
    isCompleted: false,
  });
  const [newTag, setNewTag] = useState('');

  const getTimeString = (d: Date | null) =>
    d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

  const setTime = (time: string, isStart: boolean) => {
    if (!time) return;
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    setNewTask(p => ({ ...p, [isStart ? 'startDate' : 'dueDate']: date }));
  };

  const handleConfirm = () => {
    if (!newTask.title?.trim()) return;
    onConfirm(newTask);
  };

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
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              maxLength={50}
            />
            <p className="text-sm text-gray-500">{(newTask.title || '').length}/50 字符</p>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium">{t.description}</label>
            <textarea
              className="w-full border rounded p-2"
              value={newTask.description || ''}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
            />
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium">{t.priority}</label>
            <select
              className="w-full border rounded p-2"
              value={newTask.priority}
              onChange={e => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
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
              {(newTask.tags || []).map(tag => (
                <span key={tag} className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs flex items-center">
                  {tag}
                  <button
                    onClick={() => setNewTask({ ...newTask, tags: (newTask.tags || []).filter(t => t !== tag) })}
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
                onChange={e => setNewTag(e.target.value)}
                placeholder= {t.addTag}
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

          {/* 时间（开始/截止）*/}
          <div>
            <label className="block text-sm font-medium">{t.timeSetting}</label>
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-xs">{t.startTime}</label>
                <input
                  type="time"
                  className="w-full border rounded p-2"
                  value={getTimeString(newTask.startDate)}
                  onChange={e => setTime(e.target.value, true)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs">{t.endTime}</label>
                <input
                  type="time"
                  className="w-full border rounded p-2"
                  value={getTimeString(newTask.dueDate)}
                  onChange={e => setTime(e.target.value, false)}
                />
              </div>
            </div>
          </div>

          {/* 按钮区 */}
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