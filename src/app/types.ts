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