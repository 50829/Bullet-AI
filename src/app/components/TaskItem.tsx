// src/components/TaskItem.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../types';
import { GripVertical, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updatedTask: Task) => void;
  t: Record<string, string>;
}

const priorityClasses = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-red-500',
};

export function TaskItem({ task, onToggle, onDelete, onUpdate, t }: TaskItemProps) {
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
  const [editedTask, setEditedTask] = useState<Task>({ ...task, description: task.description || '' });
  const [newTag, setNewTag] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  /* ------------ 展示用时间字符串 ------------ */
  const now = new Date();

  const startTimeStr = useMemo(() => {
    if (!task.startDate) return '';
    return new Date(task.startDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [task.startDate]);

  const { dueTimeStr, dueColor } = useMemo(() => {
    if (!task.dueDate) return { dueTimeStr: '', dueColor: 'text-gray-500' };
    const str = new Date(task.dueDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const isOver = !task.isCompleted && task.dueDate.getTime() < now.getTime();
    const color = isOver ? 'text-red-500' : 'text-blue-500';
    return { dueTimeStr: str, dueColor: color };
  }, [task.dueDate, task.isCompleted, now]);

  /* ------------ 编辑相关 ------------ */
  // 把 Date 转成 hh:mm 或空串
  const fmt = (d?: Date | null): string => {
    if (!d) return '';
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // 把 hh:mm 或空串 转成 Date 或 null
  const parse = (time: string): Date | null => {
    if (!time) return null;          // 用户清空 → null
    const [h, m] = time.split(':').map(Number);
    const newDate = new Date();
    newDate.setHours(h, m, 0, 0);
    return newDate;
  };

  const handleUpdate = () => {
    onUpdate(task.id, editedTask);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-gray-50 rounded-lg p-4 border-l-4 ${priorityClasses[editedTask.priority]} transition-shadow hover:shadow-md`}
      >
        <h3 className="font-bold mb-4">{t.editTask}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">{t.taskTitle}</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              maxLength={50}
            />
            <p className="text-sm text-gray-500">{editedTask.title.length}/50</p>
          </div>

          <div>
            <label className="block text-sm font-medium">{t.description}</label>
            <textarea
              className="w-full border rounded p-2"
              value={editedTask.description || ''}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">{t.priority}</label>
            <select
              className="w-full border rounded p-2"
              value={editedTask.priority}
              onChange={(e) =>
                setEditedTask({ ...editedTask, priority: e.target.value as 'low' | 'medium' | 'high' })
              }
            >
              <option value="low">{t.low}</option>
              <option value="medium">{t.medium}</option>
              <option value="high">{t.high}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">{t.tags}</label>
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
                placeholder={t.addTag}
              />
              <button
                onClick={() => {
                  if (newTag.trim()) {
                    setEditedTask({ ...editedTask, tags: [...editedTask.tags, newTag.trim()] });
                    setNewTag('');
                  }
                }}
                className="bg-[var(--brand-color)] text-white px-4 rounded-r"
              >
                +
              </button>
            </div>
          </div>

          {/* 时间设置：开始 / 截止 */}
          <div>
            <label className="block text-sm font-medium">{t.timeSetting}</label>
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-xs">{t.startTime}</label>
                <input
                  type="time"
                  className="w-full border rounded p-2"
                  value={fmt(editedTask.startDate)}   // 空 → 输入框留空
                  onChange={(e) =>
                    setEditedTask({ ...editedTask, startDate: parse(e.target.value) })
                  }
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs">{t.endTime}</label>
                <input
                  type="time"
                  className="w-full border rounded p-2"
                  value={fmt(editedTask.dueDate)}     // 空 → 输入框留空
                  onChange={(e) =>
                    setEditedTask({ ...editedTask, dueDate: parse(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded text-gray-600">
              {t.cancel}
            </button>
            <button onClick={handleUpdate} className="px-4 py-2 bg-[var(--brand-color)] text-white rounded">
              {t.updateTask}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ==================== 正常展示 ==================== */
  return (
    <>
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

        {/* 内容区 */}
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

        {/* 时间展示：只有真正设置了时间才渲染 */}
        <div className="text-sm text-gray-500">
          {startTimeStr && <span className="text-green-500">{startTimeStr}</span>}
          {startTimeStr && dueTimeStr && <span className="mx-1">-</span>}
          {dueTimeStr && <span className={dueColor}>{dueTimeStr}</span>}
        </div>

        {/* 删除按钮 */}
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* 确认删除弹窗 */}
      <ConfirmDialog
        open={showConfirm}
        title={
          <>
            {t.deleteConfirm}
            <span className="block mt-1 text-sm text-gray-500">“{task.title}”</span>
          </>
        }
        onConfirm={() => {
          onDelete(task.id);
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
        confirmText={t.delete}
        cancelText={t.cancel}
      />
    </>
  );
}