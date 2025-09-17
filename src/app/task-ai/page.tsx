// src/app/task-ai/page.tsx
"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { TodayView } from "../components/TodayView";
import { FutureView } from "../components/FutureView";
import { Task } from "../types";
import { isToday, isFuture } from "date-fns";
import { supabase } from "../../lib/supabaseClient";
import { TopBar } from "../components/TopBar";

const initialTasks: Task[] = [];

type Lang = "zh" | "en";
type I18nShape = {
  [key: string]: string | string[]; // 允许字符串或字符串数组
};
const I18N: Record<Lang, I18nShape> = {
  zh: {
    today: "今日任务",
    future: "未来规划",
    addTask: "+ 添加任务",
    noTitle: "任务标题 *",
    description: "任务描述",
    priority: "优先级",
    tags: "标签",
    timeSetting: '时间设置',
    startTime: "开始时间",
    endTime: "截止时间",
    low: "低优先级",
    medium: "中优先级",
    high: "高优先级",
    addTag: "添加标签",
    cancel: "取消",
    add: "添加任务",
    titlePlaceholder: "任务标题",
    descPlaceholder: "任务描述",
    tagPlaceholder: "添加标签",
    updateTask: '更新',
    todayTask: "今日：",
    futureTask: "未来：",
    bgColor: "var(--surface-soft)",
    futureTitle: "未来规划",
    futureSubtitle: "提前布局，掌控节奏",
    totalTasks: "总任务数",
    completedTasks: "已完成",
    pendingTasks: "待完成",
    overdueTasks: "已逾期",
    todayTitle: "今日任务",
    todaySubtitle: "专注当下，高效执行",
    migrateBtn: "迁移",
    noTask: "暂无任务",
    noTaskHint: "今天还没有安排任务，点击上方按钮开始创建",
    migrateTitle: "迁移列表",
    migrateSubtitle: "此处任务可安排至未来日期。",
    migrateMoveBtn: "移动",
    migrateEmpty: "迁移列表为空",
    editTask: '编辑任务',
    scheduledTitle: "已安排任务 · {date}",
    scheduledSubtitle: "选中日期的任务清单",
    scheduledMoveTodayBtn: "迁回今日",
    scheduledEmptyTitle: "暂无任务",
    scheduledEmptyHint: "点击上方日历选择日期，或把迁移列表任务移动到该日期",
    calendarTitle: "{year}年{month}月",
    weekDays: ["日", "一", "二", "三", "四", "五", "六"],
    aiTitle: "我的 AI 管家",
    aiSend: "发送",
    aiGreeting: "老板好，欢迎上线，接下来怎么安排？",
    aiThinking: "AI 正在思考…",
    aiError: "AI 开小差了，稍后再试~",
    planGenerated: "AI 已生成任务计划",
    oneClickAdd: "一键添加",
    todayPlanPrefix: "今日：",
    futurePlanPrefix: "未来：",
    aiPlaceholder: "例如：明天下午3点提醒我开会",
  },
  en: {
    today: "Today",
    future: "Future",
    addTask: "+ Add Task",
    noTitle: "Task Title *",
    description: "Description",
    priority: "Priority",
    tags: "Tags",
    timeSetting: 'Time Setting',
    startTime: "Start Time",
    endTime: "Deadline",
    low: "Low",
    medium: "Medium",
    high: "High",
    addTag: "Add Tag",
    cancel: "Cancel",
    add: "Add Task",
    titlePlaceholder: "Task title",
    descPlaceholder: "Task description",
    tagPlaceholder: "Add tag",
    updateTask: 'Update',
    todayTask: "Today: ",
    futureTask: "Future: ",
  bgColor: "var(--surface-soft)",
    futureTitle: "Future Plans",
    futureSubtitle: "Plan ahead, stay in control",
    totalTasks: "Total",
    completedTasks: "Completed",
    pendingTasks: "Pending",
    overdueTasks: "Overdue",
    todayTitle: "Today's Tasks",
    todaySubtitle: "Focus now, execute efficiently",
    migrateBtn: "Migrate",
    noTask: "No tasks yet",
    noTaskHint: "No tasks scheduled for today. Create one above.",
    migrateTitle: "Migration List",
    migrateSubtitle: "Tasks here can be scheduled to a future date.",
    migrateMoveBtn: "Move",
    migrateEmpty: "Migration list is empty",
    editTask: 'Edit Task',
    scheduledTitle: "Scheduled Tasks · {date}",
    scheduledSubtitle: "Task list for the selected date",
    scheduledMoveTodayBtn: "Move to Today",
    scheduledEmptyTitle: "No tasks",
    scheduledEmptyHint:
      "Select a date in the calendar above or move tasks from the migration list",
    calendarTitle: "{month}/{year}",
    weekDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    aiTitle: "My AI Butler",
    aiSend: "Send",
    aiGreeting: "Hello boss, what's next?",
    aiThinking: "AI is thinking…",
    aiError: "AI is down, please try again~",
    planGenerated: "AI has generated a task plan",
    oneClickAdd: "Add All",
    todayPlanPrefix: "Today: ",
    futurePlanPrefix: "Future: ",
    aiPlaceholder: "e.g. Remind me to have a meeting at 3pm tomorrow",
  },
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [currentView, setCurrentView] = useState<"today" | "future">("today");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [lang, setLang] = useState<Lang>("zh");

  // 读取本地存储的语言偏好
  useEffect(() => {
    const saved = localStorage.getItem("task-lang") as Lang | null;
    if (saved) setLang(saved);
  }, []);

  // 保存语言切换
  const handleChangeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("task-lang", l);
  };

  const t = I18N[lang];

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    priority: "medium",
    tags: [],
    startDate: null,
    dueDate: new Date(),
    isCompleted: false,
  });
  const [newTag, setNewTag] = useState("");

  /* ========== 实时订阅：只收别人/别的设备的变更 ========== */
  const skipNext = useRef(false);
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const userId = user.id;
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (!error && data) {
        const dbTasks: Task[] = data.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          priority: row.priority,
          tags: row.tags,
          startDate: row.start_date ? new Date(row.start_date) : null,
          dueDate: row.due_date ? new Date(row.due_date) : null,
          isCompleted: row.is_completed,
          createdAt: new Date(row.created_at),
        }));
        setTasks(dbTasks);
      }
      channel = supabase
        .channel("tasks_realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (skipNext.current) {
              skipNext.current = false;
              return;
            }
            const { eventType, new: record, old } = payload;
            if (eventType === "INSERT") {
              const t: Task = {
                id: record.id,
                title: record.title,
                description: record.description,
                priority: record.priority,
                tags: record.tags,
                startDate: record.start_date
                  ? new Date(record.start_date)
                  : null,
                dueDate: record.due_date ? new Date(record.due_date) : null,
                isCompleted: record.is_completed,
                createdAt: new Date(record.created_at),
              };
              setTasks((prev) => [...prev, t]);
            } else if (eventType === "UPDATE") {
              const t: Task = {
                id: record.id,
                title: record.title,
                description: record.description,
                priority: record.priority,
                tags: record.tags,
                startDate: record.start_date
                  ? new Date(record.start_date)
                  : null,
                dueDate: record.due_date ? new Date(record.due_date) : null,
                isCompleted: record.is_completed,
                createdAt: new Date(record.created_at),
              };
              setTasks((prev) =>
                prev.map((item) => (item.id === t.id ? t : item))
              );
            } else if (eventType === "DELETE") {
              setTasks((prev) => prev.filter((item) => item.id !== old.id));
            }
          }
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* -------- 本地写：带防抖 + 跳过监听 -------- */
  const writeDebounce = useRef<NodeJS.Timeout | undefined>(undefined);
  useEffect(() => {
    if (tasks === initialTasks) return;
    clearTimeout(writeDebounce.current);
    writeDebounce.current = setTimeout(async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const userId = user.id;
      skipNext.current = true;
      await supabase.from("tasks").delete().eq("user_id", userId);
      if (tasks.length) {
        const rows = tasks.map((t) => ({
          id: t.id,
          user_id: userId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          tags: t.tags,
          start_date: t.startDate,
          due_date: t.dueDate,
          is_completed: t.isCompleted,
          created_at: t.createdAt,
        }));
        await supabase.from("tasks").insert(rows);
      }
    }, 300);
    return () => clearTimeout(writeDebounce.current);
  }, [tasks]);

  /* -------- 任务筛选 -------- */
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate && isToday(t.dueDate)),
    [tasks]
  );
  const futureTasks = useMemo(
    () => tasks.filter((t) => t.dueDate && isFuture(t.dueDate)),
    [tasks]
  );
  const migrationListTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === null),
    [tasks]
  );

  /* -------- 核心功能函数 -------- */
  const handleAddTask = () => {
    if (!newTask.title) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title || "",
      description: newTask.description,
      priority: newTask.priority || "medium",
      tags: newTask.tags || [],
      startDate: newTask.startDate || null,
      dueDate: newTask.dueDate,
      isCompleted: false,
      createdAt: new Date(),
    };
    setTasks((prev) => [...prev, task]);
    setIsAddingTask(false);
    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      tags: [],
      startDate: null,
      dueDate: new Date(),
      isCompleted: false,
    });
    setNewTag("");
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((ts) =>
      ts.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== taskId));
  };

  const handleSetTasks = (reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
  };

  const getTimeString = (date: Date | null): string => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const setTime = (time: string, isStart: boolean) => {
    if (!time) return;
    const [hours, minutes] = time.split(":").map(Number);
    const newDate = new Date();
    newDate.setHours(hours, minutes, 0, 0);
    if (isStart) {
      setNewTask({ ...newTask, startDate: newDate });
    } else {
      setNewTask({ ...newTask, dueDate: newDate });
    }
  };

  /* -------- 视图渲染 -------- */
  const renderView = () => {
    const commonProps = {
      tasks,
      setTasks,
      onAddTask: handleAddTask,
      onUpdateTask: handleUpdateTask,
      onDeleteTask: handleDeleteTask,
      t: t as Record<string, string>,
    };
    if (currentView === "today") {
      return <TodayView todayTasks={todayTasks} {...commonProps} lang={lang} />;
    }
    return (
      <FutureView
        futureTasks={futureTasks}
        migrationListTasks={migrationListTasks}
        {...commonProps}
        lang={lang}
      />
    );
  };

  const renderAddTaskPanel = () => {
    if (!isAddingTask) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="font-bold mb-4">{t.add}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">{t.noTitle}</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={newTask.title || ""}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                maxLength={50}
              />
              <p className="text-sm text-gray-500">
                {(newTask.title || "").length}/50
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium">
                {t.description}
              </label>
              <textarea
                className="w-full border rounded p-2"
                value={newTask.description || ""}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t.priority}</label>
              <select
                className="w-full border rounded p-2"
                value={newTask.priority || "medium"}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    priority: e.target.value as "low" | "medium" | "high",
                  })
                }
              >
                <option value="low">{t.low}</option>
                <option value="medium">{t.medium}</option>
                <option value="high">{t.high}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">{t.tags}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(newTask.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-200 text-gray-600 px-2 py-1 rounded flex items-center text-xs"
                  >
                    {tag}
                    <button
                      onClick={() =>
                        setNewTask({
                          ...newTask,
                          tags: (newTask.tags || []).filter((t) => t !== tag),
                        })
                      }
                      className="ml-1 text-red-500"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  className="flex-grow border rounded-l p-2"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder={t.tagPlaceholder as string}
                />
                <button
                  onClick={() => {
                    if (newTag.trim()) {
                      setNewTask({
                        ...newTask,
                        tags: [...(newTask.tags || []), newTag.trim()],
                      });
                      setNewTag("");
                    }
                  }}
                  className="bg-[#d6c7b5] text-white px-4 rounded-r"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">{t.startTime}</label>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-xs">{t.startTime}</label>
                  <input
                    type="time"
                    className="w-full border rounded p-2"
                    value={getTimeString(newTask.startDate)}
                    onChange={(e) => setTime(e.target.value, true)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs">{t.endTime}</label>
                  <input
                    type="time"
                    className="w-full border rounded p-2"
                    value={getTimeString(newTask.dueDate)}
                    onChange={(e) => setTime(e.target.value, false)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-2 border rounded text-gray-600"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-[var(--brand-color)] text-white rounded"
              >
                {t.add}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen font-sans text-gray-800"
      style={{ backgroundColor: t.bgColor as string }}
    >
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <TopBar
          lang={lang}
          onChangeLang={handleChangeLang}
          currentView={currentView}
          onChangeView={setCurrentView}
          onAddTask={() => setIsAddingTask(true)}
          showAdd={currentView === "today"}
          t={t as Record<string, string>}
        />

        {renderView()}
        {renderAddTaskPanel()}
      </main>
    </div>
  );
}
