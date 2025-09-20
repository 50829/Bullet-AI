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
  defaultDate?: Date | null;
}

const priorityClasses = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-red-500',
};

export function TaskItem({ task, onToggle, onDelete, onUpdate, t, defaultDate}: TaskItemProps) {
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

  /* ------------ 展示用时间字符串 (已修改) ------------ */
  const now = new Date();

  const startTimeStr = useMemo(() => {
    if (!task.startDate) return '';
    const startDate = new Date(task.startDate);
    // 如果时间是 00:00，则不显示
    if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
      return '';
    }
    return startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [task.startDate]);

  const { dueTimeStr, dueColor } = useMemo(() => {
    if (!task.dueDate) return { dueTimeStr: '', dueColor: 'text-gray-500' };
    
    const dueDate = new Date(task.dueDate);
    let isOver = false;
    let timeStr = '';

    // 检查是否为 "全天" 任务 (时间为 00:00)
    if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
      timeStr = ''; // 不显示时间
      // 对于全天任务，只有当整个日期都过去后才算逾期
      const endOfDay = new Date(dueDate);
      endOfDay.setHours(23, 59, 59, 999);
      isOver = !task.isCompleted && endOfDay.getTime() < now.getTime();
    } else {
      // 对于有具体时间的任务，按原逻辑处理
      timeStr = dueDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      isOver = !task.isCompleted && dueDate.getTime() < now.getTime();
    }
    
    const color = isOver ? 'text-red-500' : 'text-blue-500';
    return { dueTimeStr: timeStr, dueColor: color };
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
  const parse = (time: string, baseDate?: Date | null): Date | null => {
    if (!time) return null;
    const [h, m] = time.split(':').map(Number);
    
    // 优先使用任务自身的日期。如果任务没日期(迁移列表)，则用 defaultDate (日历选中日期)。
    // 如果都没有，才退回至今天。
    const newDate = baseDate ? new Date(baseDate) : (defaultDate ? new Date(defaultDate) : new Date());

    newDate.setHours(h, m, 0, 0);
    return newDate;
  };

  const handleUpdate = () => {
    // 🔥 关键修改：如果是迁移列表中的任务，保持 dueDate 为 null
    const shouldKeepInMigration = !task.dueDate; // 原来就在迁移列表的任务
    const finalTask = shouldKeepInMigration 
      ? { ...editedTask, dueDate: null, startDate: null }  // 保持在迁移列表
      : editedTask; // 否则保持原有逻辑
    
    onUpdate(task.id, finalTask);
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

          {/* 🔥 只有当任务已经有 dueDate 时才显示时间设置（即已安排到具体日期的任务） */}
          {task.dueDate && (
            <div>
              <label className="block text-sm font-medium">{t.timeSetting}</label>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-xs">{t.startTime}</label>
                  <input
                    type="time"
                    className="w-full border rounded p-2"
                    value={fmt(editedTask.startDate)}
                    onChange={(e) =>
                      setEditedTask({ ...editedTask, startDate: parse(e.target.value, editedTask.startDate) })
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs">{t.endTime}</label>
                  <input
                    type="time"
                    className="w-full border rounded p-2"
                    value={fmt(editedTask.dueDate)}
                    onChange={(e) =>
                      setEditedTask({ ...editedTask, dueDate: parse(e.target.value, editedTask.dueDate) })
                    }
                  />
                </div>
              </div>
            </div>
          )}

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