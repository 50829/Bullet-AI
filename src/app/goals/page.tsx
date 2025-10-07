"use client"; // Required for useState

import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Habit } from '../types';
import { Edit, Trash2, CheckCircle } from 'lucide-react';
import { GoalModal } from "../components/GoalModal";
import { HabitModal } from "../components/HabitModal";

// Mock Data
const mockHabits: Habit[] = [
  { id: 1, title: '晨间阅读', description: '每天早上阅读30分钟', frequency: '每日', checkInCount: 0 },
  { id: 2, title: '运动打卡', description: '保持身体健康', frequency: '每日', checkInCount: 0 },
  { id: 3, title: '冥想', description: '内心平静', frequency: '每日', checkInCount: 0 },
];

const HabitCard = ({ habit }: { habit: Habit }) => (
  <Card>
    <div className="flex justify-between items-start">
      <div>
        <div className="flex items-center mb-2">
          <h4 className="font-bold text-lg text-gray-800">{habit.title}</h4>
          <span className="ml-3 bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-md">{habit.frequency}</span>
        </div>
        <p className="text-gray-500 mb-3">{habit.description}</p>
        <div className="flex items-center text-green-600">
          <CheckCircle size={16} />
          <span className="ml-2 text-sm">已打卡 {habit.checkInCount} 次</span>
        </div>
      </div>
      <div className="flex space-x-3 text-gray-400">
        <Edit size={18} className="cursor-pointer hover:text-gray-600" />
        <Trash2 size={18} className="cursor-pointer hover:text-red-500" />
      </div>
    </div>
  </Card>
);

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState('我的习惯');
  const tabs = ['今日待办', '近期目标', '我的习惯'];
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);

  const handleOpenModal = () => {
    if (activeTab === '我的习惯') {
      setIsHabitModalOpen(true);
    } else {
      setIsGoalModalOpen(true);
    }
  };

  const handleCloseGoalModal = () => {
    setIsGoalModalOpen(false);
  };

  const handleCloseHabitModal = () => {
    setIsHabitModalOpen(false);
  };

  const handleSuccess = () => {
    // 这里可以添加刷新数据的逻辑
    console.log('操作成功');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">我的目标</h2>
          <p className="text-gray-500 mt-1">规划未来，成就更好的自己</p>
        </div>
        <Button onClick={handleOpenModal}>+ 新建{activeTab === '我的习惯' ? '习惯' : '目标'}</Button>
      </div>

      <div className="flex space-x-4 border-b mb-6">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-1 font-medium transition-colors duration-200 ${activeTab === tab ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === '今日待办' && <Card><p className="text-center text-gray-500">还没有待办事项</p></Card>}
        {activeTab === '近期目标' && <Card><p className="text-center text-gray-500">还没有近期目标</p></Card>}
        {activeTab === '我的习惯' && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-700">我的习惯 ({mockHabits.length})</h3>
            {mockHabits.map(habit => <HabitCard key={habit.id} habit={habit} />)}
          </div>
        )}
      </div>

      {/* 目标模态框 */}
      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={handleCloseGoalModal}
        onSuccess={handleSuccess}
      />

      {/* 习惯模态框 */}
      <HabitModal 
        isOpen={isHabitModalOpen}
        onClose={handleCloseHabitModal}
        onSuccess={handleSuccess}
      />
    </div>
  );
};