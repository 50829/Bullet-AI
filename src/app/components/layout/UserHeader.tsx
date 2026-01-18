"use client";
import React from 'react';
import { Sparkles } from 'lucide-react';

export const UserHeader = () => {
  return (
    <>
      {/* 桌面端 */}
      <div className="fixed left-4 top-4 z-30 hidden lg:flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-gray-700" />
        <span className="text-2xl font-bold text-gray-800">BulletAI</span>
      </div>
      {/* 移动端 */}
      <div className="fixed left-4 top-4 z-30 flex items-center gap-3 lg:hidden">
        <Sparkles className="h-8 w-8 text-gray-700" />
        <span className="text-2xl font-bold text-gray-800">BulletAI</span>
      </div>
    </>
  );
};
