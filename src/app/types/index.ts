export interface Moment {
    id: number;
    date: string;
    content: string;
    imageUrl?: string;
  }
  
  export interface Reflection {
    id: number;
    date: string;
    content: string;
    source: string;
    sourceType: '读书' | '电影' | '观察' | '思考';
  }
  
  export interface Habit {
    id: number;
    title: string;
    description: string;
    frequency: '每日' | '每周';
    checkInCount: number;
  }
  
  export interface Todo {
    id: number;
    text: string;
    completed: boolean;
  }

  // ================== Task & Priority（从原 types.ts 合并） ==================
  export type Priority = 'low' | 'medium' | 'high';

  export interface Task {
    id: string;
    title: string;
    description?: string;
    priority: Priority;
    tags: string[];
    startDate: Date | null;
    dueDate: Date | null; // null 表示在迁移列表，未安排日期
    isCompleted: boolean;
    createdAt: Date;
  }

  // 现在所有类型集中在同一个 index.ts，导入时统一使用 "import { Task } from '.../app/types'"