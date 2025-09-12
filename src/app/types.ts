export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;  // Add this
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
}