"use client";
import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tag } from '../components/ui/Tag';
import { Edit, Trash2 } from 'lucide-react';
import { Reflection } from '../types';
import { ReflectionModal } from '../components/ReflectionModal'; // 导入模态框组件

// Mock Data
const mockReflections: Reflection[] = [
    {id: 1, date: '2025年10月07日', content: '读完《人类简史》后，对人类文明有了新的认识。我们创造的虚构故事整合了整个社会的运作方式，这个观点让我重新思考很多事情。', source: '《人类简史》尤瓦尔·赫拉利', sourceType: '读书'},
    {id: 2, date: '2025年10月07日', content: '今天看电影时突然意识到，人生就像一场旅行，重要的不是目的地，而是沿途的风景和遇见的人。', source: '电影', sourceType: '电影'},
    {id: 3, date: '2025年10月07日', content: '在咖啡馆观察来往的人群，每个人都有自己的故事。学会欣赏生活中的细节，会发现世界原来如此丰富多彩。', source: '咖啡馆', sourceType: '观察'},
];

const ReflectionCard = ({ reflection }: { reflection: Reflection }) => (
    <Card>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm text-gray-400 mb-2">{reflection.date}</p>
                <p className="text-gray-700 mb-4">{reflection.content}</p>
                <div className="flex items-center space-x-2">
                    <Tag>{reflection.sourceType}</Tag>
                    {reflection.sourceType !== '电影' && reflection.sourceType !== '观察' && <span className="text-sm text-gray-500">{reflection.source}</span>}
                </div>
            </div>
            <div className="flex space-x-3 text-gray-400">
                <Edit size={18} className="cursor-pointer hover:text-gray-600"/>
                <Trash2 size={18} className="cursor-pointer hover:text-red-500"/>
            </div>
        </div>
    </Card>
);

export default function ReflectionsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSuccess = () => {
        // 这里可以添加刷新数据的逻辑
        console.log('感悟发布成功');
        // 例如：重新获取数据或更新状态
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">我的感悟</h2>
                    <p className="text-gray-500 mt-1">记录生活中的灵感与思考</p>
                </div>
                <Button onClick={handleOpenModal}>+ 记录新感悟</Button>
            </div>
            <div className="mb-6">
                <Input placeholder="搜索感悟..."/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockReflections.map(reflection => (
                    <ReflectionCard key={reflection.id} reflection={reflection} />
                ))}
            </div>
            
            {/* 感悟模态框 */}
            <ReflectionModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={handleSuccess}
            />
        </div>
    );
}