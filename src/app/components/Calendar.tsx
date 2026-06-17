// components/Calendar.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toDateKey } from "../../lib/date/dateUtils";

type Goal = {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  image_path?: string | null;
  status?: string;
  due_date?: string | null;
  progress?: number;
};

type CalendarProps = {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  goals: Goal[];
};

export const Calendar = ({ selectedDate, onDateSelect, goals }: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const todayLabel = `${today.getMonth() + 1}月${today.getDate()}日`;

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px 以下为移动端
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 获取月份的第一天和最后一天
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  // 创建日期数组
  const days: (number | null)[] = [];
  
  // 上个月的日期
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(null);
  }
  
  // 本月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  // 下个月的日期（填充到42个格子）
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(null);
  }

  const getDateKeyForDay = (day: number | null) => {
    if (day === null) return null;
    return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const goalCountByDate = useMemo(() => {
    const counts = new Map<string, number>();

    goals.forEach((goal) => {
      if (!goal.due_date) return;
      counts.set(goal.due_date, (counts.get(goal.due_date) ?? 0) + 1);
    });

    return counts;
  }, [goals]);

  const getGoalCountOnDate = (day: number | null): number => {
    const dateKey = getDateKeyForDay(day);
    if (!dateKey) return 0;
    return goalCountByDate.get(dateKey) ?? 0;
  };

  // 检查是否是今天
  const isToday = (day: number | null): boolean => {
    if (day === null) return false;
    return getDateKeyForDay(day) === todayKey;
  };

  // 检查是否是选中的日期
  const isSelected = (day: number | null): boolean => {
    if (day === null || !selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  // 处理日期点击
  const handleDayClick = (day: number | null) => {
    if (day === null) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect(date);
  };

  // 切换到上一个月
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // 切换到下一个月
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className={`rounded-xl p-4 ${isMobile ? 'h-auto min-h-[400px]' : 'h-[520px]'} flex flex-col bg-[var(--color-panel-primary)]`}>
      {/* 月份导航 */}
      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        {/* 标题放在左上角 */}
        <div>
          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-[var(--color-panel-text)]`}>
            {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
          </h3>
          <p className="mt-1 text-sm font-medium text-[var(--color-panel-text)] opacity-80">
            今天 {todayLabel}
          </p>
        </div>
        {/* 月份切换按钮放在右上角 */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-2xl transition-colors hover:bg-black/10"
          >
            <ChevronLeft className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-[var(--color-panel-text)]`} />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-2xl transition-colors hover:bg-black/10"
          >
            <ChevronRight className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-[var(--color-panel-text)]`} />
          </button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2 flex-shrink-0">
        {weekDays.map((day) => (
          <div key={day} className={`text-center ${isMobile ? 'text-sm' : 'text-lg'} font-medium text-[var(--color-panel-text)] py-1`}>
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className={`grid grid-cols-7 gap-1 ${isMobile ? '' : 'flex-1 min-h-0'}`}>
        {days.map((day, index) => {
          const goalCount = getGoalCountOnDate(day);
          const visibleDots = Math.min(goalCount, 3);
          const today = isToday(day);
          const selected = isSelected(day);

          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={day === null}
              className={`
                aspect-square ${isMobile ? 'p-1' : 'p-2'} rounded-xl ${isMobile ? 'text-sm' : 'text-lg'} flex flex-col items-center justify-center gap-1
                ${day === null ? 'cursor-default opacity-0' : 'cursor-pointer'}
                ${selected ? 'border-2 border-[var(--color-panel-text)] bg-white/15' : 'border-2 border-transparent'}
                ${today ? 'font-semibold' : ''}
                ${day !== null ? 'text-[var(--color-panel-text)] hover:bg-white/10' : ''}
              `}
            >
              <span>{day}</span>
              <span className="flex h-2 items-center justify-center gap-0.5">
                {Array.from({ length: visibleDots }).map((_, dotIndex) => (
                  <span
                    key={dotIndex}
                    className="h-1.5 w-1.5 rounded-full bg-[var(--color-panel-text)]"
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
