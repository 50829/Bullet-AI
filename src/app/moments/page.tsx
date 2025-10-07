"use client";
import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tag } from '../components/ui/Tag';
import { Edit, Trash2 } from 'lucide-react';
import { Moment } from '../types';
import { MomentModal } from '../components/MomentModal';

// Mock Data
const mockMoments: Moment[] = [
  { id: 1, date: '2025年10月07日 04:16', content: '今天早上看到了美丽的日出，橙红色的天空让人心情愉悦。新的一天，充满希望。', tags: ['生活', '公园'] },
  { id: 2, date: '2025年10月07日 04:16', content: '完成了一个重要的项目，团队合作很顺利。这种成就感让我觉得一切努力都是值得的。', tags: ['工作'] },
];

export default function MomentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddMoment = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    // 这里可以刷新数据或更新列表
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">我的时刻</h2>
          <p className="text-gray-500 mt-1">珍藏每一个值得记录的瞬间</p>
        </div>
        <Button onClick={handleAddMoment}>+ 记录新时刻</Button>
      </div>
      <div className="mb-6">
        <Input placeholder="搜索时刻..." />
      </div>
      <div className="space-y-6">
        {mockMoments.map(moment => (
          <Card key={moment.id}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-400 mb-2">{moment.date}</p>
                <p className="text-gray-700 mb-4">{moment.content}</p>
                <div className="flex flex-wrap gap-2">
                  {moment.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                </div>
              </div>
              <div className="flex space-x-3 text-gray-400">
                <Edit size={18} className="cursor-pointer hover:text-gray-600" />
                <Trash2 size={18} className="cursor-pointer hover:text-red-500" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* 添加时刻模态框 */}
      <MomentModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}