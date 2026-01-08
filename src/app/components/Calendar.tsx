// components/Calendar.tsx
"use client";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarProps = {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  goalsWithDates: { date: string }[];
};

export const Calendar = ({ selectedDate, onDateSelect, goalsWithDates }: CalendarProps) => {
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

  // 检查某天是否有目标
  const hasGoalOnDate = (day: number | null): boolean => {
    if (day === null) return false;
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return goalsWithDates.some(goal => {
      if (!goal.date) return false;
      // 直接比较字符串，避免时区转换问题
      return goal.date === dateStr;
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
    <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-4">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-gray-800">
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
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const hasGoal = hasGoalOnDate(day);
          const today = isToday(day);
          const selected = isSelected(day);

          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={day === null}
              className={`
                aspect-square p-2 rounded-lg text-sm transition-all
                ${day === null ? 'cursor-default opacity-0' : 'cursor-pointer'}
                ${selected 
                  ? 'bg-orange-400 text-white font-bold' 
                  : today 
                    ? 'bg-orange-100 text-orange-600 font-semibold' 
                    : hasGoal
                      ? 'bg-blue-50 text-gray-800 hover:bg-blue-100'
                      : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {day}
              {hasGoal && !selected && (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

