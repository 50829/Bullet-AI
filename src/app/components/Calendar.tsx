// src/components/Calendar.tsx
import { useState } from 'react';
import { Task } from '../types';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  selectedDate?: Date | null;
  onDateSelect?: (date: Date) => void;
  t: {
    calendarTitle: string;
    weekDays: string[];
  };
  lang: 'zh' | 'en';
}

export function Calendar({
  tasks,
  onDateSelect,
  selectedDate,
  t,
  lang,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);

  const daysInMonth = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth,
  });

  const startingDayIndex = getDay(firstDayOfMonth);

  const tasksByDate = tasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    const dateKey = format(task.dueDate, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc as Record<string, Task[]>;
  }, {} as Record<string, Task[]>);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      {/* 标题 & 翻月按钮 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          {t.calendarTitle
            .replace('{year}', format(currentMonth, 'yyyy'))
            .replace('{month}', format(currentMonth, lang === 'en' ? 'MM' : 'MM'))}
        </h2>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500 mb-2">
        {t.weekDays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: startingDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {daysInMonth.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateKey] || [];
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={day.toString()}
              onClick={() => onDateSelect?.(day)}
              className={`p-2 rounded-lg cursor-pointer flex flex-col items-center justify-start h-24 border transition
                ${isSelected ? 'bg-[#F9F7F1] border-[#c9b8a1]' : isToday(day) ? 'bg-blue-100 border-blue-200' : 'hover:bg-gray-50'}
              `}
            >
              <span
                className={`${
                  isToday(day) ? 'font-bold text-blue-600' : ''
                } ${!isSameMonth(day, currentMonth) ? 'text-gray-300' : ''}`}
              >
                {format(day, 'd')}
              </span>
              {dayTasks.length > 0 && (
                <div className="mt-1 w-2 h-2 bg-blue-400 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}