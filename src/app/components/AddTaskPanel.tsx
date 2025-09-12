// src/components/AddTaskPanel.tsx
import { useState } from 'react';
import { Task } from '../types';

interface Props {
  onClose: () => void;
  onConfirm: (task: Partial<Task>) => void;
}

export function AddTaskPanel({ onClose, onConfirm }: Props) {
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
        <h3 className="font-bold mb-4">添加新任务</h3>
        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium">任务标题 *</label>
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
            <label className="block text-sm font-medium">任务描述</label>
            <textarea
              className="w-full border rounded p-2"
              value={newTask.description || ''}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
            />
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium">优先级</label>
            <select
              className="w-full border rounded p-2"
              value={newTask.priority}
              onChange={e => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
            >
              <option value="low">低优先级</option>
              <option value="medium">中优先级</option>
              <option value="high">高优先级</option>
            </select>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium">标签</label>
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

          {/* 时间（开始/截止）*/}
          <div>
            <label className="block text-sm font-medium">时间设置</label>
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-xs">开始时间</label>
                <input
                  type="time"
                  className="w-full border rounded p-2"
                  value={getTimeString(newTask.startDate)}
                  onChange={e => setTime(e.target.value, true)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs">截止时间</label>
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
              取消
            </button>
            <button onClick={handleConfirm} className="px-4 py-2 bg-orange-500 text-white rounded">
              添加任务
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}