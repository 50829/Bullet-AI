export interface Moment {
    id: number;
    date: string;
    content: string;
    tags: string[];
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