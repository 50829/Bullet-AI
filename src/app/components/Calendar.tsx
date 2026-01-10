// components/Calendar.tsx
"use client";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  // 获取月份的第一天和最后一天
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // 获取上个月的最后几天
  const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
  
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

  // 检查某天是否有未完成的目标
  const hasIncompleteGoalOnDate = (day: number | null): boolean => {
    if (day === null) return false;
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return goals.some(goal => {
      if (!goal.due_date) return false;
      // 直接比较字符串，避免时区转换问题
      if (goal.due_date !== dateStr) return false;
      // 只返回未完成的目标
      return goal.status !== 'completed';
    });
  };

  // 检查是否是今天
  const isToday = (day: number | null): boolean => {
    if (day === null) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
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
    <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-4 h-[520px] flex flex-col">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-semibold text-gray-800">
          {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2 flex-shrink-0">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-base font-medium text-gray-600 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
        {days.map((day, index) => {
          const hasIncompleteGoal = hasIncompleteGoalOnDate(day);
          const today = isToday(day);
          const selected = isSelected(day);

          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={day === null}
              className={`
                aspect-square p-2 rounded-full text-base transition-all flex items-center justify-center
                ${day === null ? 'cursor-default opacity-0' : 'cursor-pointer hover:bg-gray-100'}
                ${selected ? 'border-2 border-orange-400' : ''}
                ${today ? 'text-orange-600 font-semibold' : day !== null ? 'text-gray-700' : ''}
                ${hasIncompleteGoal ? 'bg-blue-50' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

