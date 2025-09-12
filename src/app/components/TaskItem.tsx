// src/components/TaskItem.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../types';
import { GripVertical, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updatedTask: Task) => void;
}

const priorityClasses = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-red-500',
};

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState({ ...task, description: task.description || '' });
  const [newTag, setNewTag] = useState('');

  /* ------------ 时间颜色规则 ------------ */
  const now = new Date();

  // 开始时间字符串 & 颜色（永远绿色）
  const startTimeStr = useMemo(() => {
    if (!task.startDate) return '';
    return new Date(task.startDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [task.startDate]);

  // 截止时间字符串 & 颜色
  const { dueTimeStr, dueColor } = useMemo(() => {
    if (!task.dueDate) return { dueTimeStr: '', dueColor: 'text-gray-500' };
    const str = new Date(task.dueDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    // 逾期判断：未完成任务 && 现实时间已超 dueDate
    const isOver = !task.isCompleted && task.dueDate.getTime() < now.getTime();
    const color = isOver ? 'text-red-500' : 'text-orange-500';
    return { dueTimeStr: str, dueColor: color };
  }, [task.dueDate, task.isCompleted, now]);
  /* ------------------------------------- */

  const handleUpdate = () => {
    onUpdate(task.id, editedTask);
    setIsEditing(false);
  };

  const getTimeString = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const setTime = (time: string, isStart: boolean) => {
    if (!time) return;
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date();
    newDate.setHours(hours, minutes, 0, 0);
    if (isStart) {
      setEditedTask({ ...editedTask, startDate: newDate });
    } else {
      setEditedTask({ ...editedTask, dueDate: newDate });
    }
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-gray-50 rounded-lg p-4 border-l-4 ${priorityClasses[editedTask.priority]} transition-shadow hover:shadow-md`}
      >
        <h3 className="font-bold mb-4">编辑任务</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">任务标题 *</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              maxLength={50}
            />
            <p className="text-sm text-gray-500">{editedTask.title.length}/50 字符</p>
          </div>
          <div>
            <label className="block text-sm font-medium">任务描述</label>
            <textarea
              className="w-full border rounded p-2"
              value={editedTask.description || ''}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">优先级</label>
            <select
              className="w-full border rounded p-2"
              value={editedTask.priority}
              onChange={(e) =>
                setEditedTask({ ...editedTask, priority: e.target.value as 'low' | 'medium' | 'high' })
              }
            >
              <option value="low">低优先级</option>
              <option value="medium">中优先级</option>
              <option value="high">高优先级</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">标签</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {editedTask.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-200 text-gray-600 px-2 py-1 rounded flex items-center text-xs"
                >
                  {tag}
                  <button
                    onClick={() =>
                      setEditedTask({
                        ...editedTask,
                        tags: editedTask.tags.filter((t) => t !== tag),
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
                placeholder="添加标签"
              />
              <button
                onClick={() => {
                  if (newTag.trim()) {
                    setEditedTask({ ...editedTask, tags: [...editedTask.tags, newTag.trim()] });
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
                  value={getTimeString(editedTask.startDate)}
                  onChange={(e) => setTime(e.target.value, true)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs">截止时间</label>
                <input
                  type="time"
                  className="w-full border rounded p-2"
                  value={getTimeString(editedTask.dueDate)}
                  onChange={(e) => setTime(e.target.value, false)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded text-gray-600">
              取消
            </button>
            <button onClick={handleUpdate} className="px-4 py-2 bg-orange-500 text-white rounded">
              更新任务
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 rounded-lg p-4 flex items-center space-x-4 border-l-4 ${priorityClasses[task.priority]} transition-shadow hover:shadow-md`}
    >
      {/* 拖拽把手 */}
      <div {...attributes} {...listeners} className="cursor-grab text-gray-400">
        <GripVertical size={20} />
      </div>

      {/* 勾选 */}
      <input
        type="checkbox"
        checked={task.isCompleted}
        onChange={() => onToggle(task.id)}
        className="form-checkbox h-5 w-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
      />

      {/* 内容 */}
      <div className="flex-grow" onDoubleClick={() => setIsEditing(true)}>
        <p className={`font-medium ${task.isCompleted ? 'line-through text-gray-400' : ''}`}>
          {task.title}
        </p>
        {task.description && (
          <p className={`text-sm ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-600'}`}>
            {task.description}
          </p>
        )}
        <div className="flex space-x-2 mt-1">
          {task.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 时间区域 */}
      <div className="text-sm text-gray-500">
        {/* 开始时间 —— 永远绿色 */}
        {startTimeStr && <span className="text-green-500">{startTimeStr}</span>}
        {startTimeStr && dueTimeStr && <span className="mx-1">-</span>}
        {/* 截止时间 —— 逾期红 / 未逾期橙 */}
        {dueTimeStr && <span className={dueColor}>{dueTimeStr}</span>}
      </div>

      {/* 删除 */}
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="text-gray-400 hover:text-red-500 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}