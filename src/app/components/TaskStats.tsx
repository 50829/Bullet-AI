// src/components/TaskStats.tsx
interface TaskStatsProps {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  }
  
  export function TaskStats({ total, completed, pending, overdue }: TaskStatsProps) {
    const stats = [
      { label: '总任务数', value: total, color: 'text-blue-500' },
      { label: '已完成', value: completed, color: 'text-green-500' },
      { label: '待完成', value: pending, color: 'text-orange-500' },
      { label: '已逾期', value: overdue, color: 'text-red-500' },
    ];
  
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-start">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className={`text-4xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    );
  }