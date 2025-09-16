// src/components/TaskStats.tsx
interface TaskStatsProps {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  t: Record<string, string>;   // ← 新增
}

export function TaskStats({ total, completed, pending, overdue, t }: TaskStatsProps) {
  const stats = [
    { label: t.totalTasks, value: total, color: 'text-black' },
    { label: t.completedTasks, value: completed, color: 'text-green-500' },
    { label: t.pendingTasks, value: pending, color: 'text-blue-500' },
    { label: t.overdueTasks, value: overdue, color: 'text-red-500' },
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