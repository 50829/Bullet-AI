"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  done: boolean;
  list: "daily" | "future";
  position: number;
  created_at?: string;
  updated_at?: string | null;
};

// 任务项组件
function SortableTaskItem({
  task,
  isSelected,
  onSelect,
  onToggle,
  onEdit,
  onMove,
  view,
  isEditing,
  editingTitle,
  editingDesc,
  setEditingTitle,
  setEditingDesc,
  saveEdit,
  cancelEdit,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  // 移除缩放分量，避免拖拽预览被压扁或拉伸；并固定宽度占满容器
  const finalTransform = transform ? { ...transform, scaleX: 1, scaleY: 1 } : null;
  const style = {
    transform: CSS.Transform.toString(finalTransform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: "100%",
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center justify-between p-2 rounded cursor-pointer touch-none ${isSelected ? "bg-gray-200" : ""}`}
      onClick={() => onSelect(task.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit(task.id, task.title, task.description || "");
      }}
   >
      <div className="flex items-start gap-2 w-full">
        <input
          type="checkbox"
          checked={task.done}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className="w-5 h-5 self-center"
        />
        <div className="flex-1">
          {isEditing ? (
            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => {
                  if (e.target.value.length <= 30) setEditingTitle(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") saveEdit(task.id);
                }}
                autoFocus
                placeholder="任务标题（最多30字符）"
                className="border rounded px-2 py-1 text-sm w-full text-black"
              />
              <textarea
                value={editingDesc}
                onChange={(e) => setEditingDesc(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit(task.id);
                  }
                }}
                rows={2}
                placeholder="任务描述（可选）"
                className="border rounded px-2 py-1 text-xs text-gray-700 w-full resize-none"
              />
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-sm rounded bg-[#d6c7b5] text-white hover:bg-[#c9b8a1]"
                  onClick={() => saveEdit(task.id)}
                >
                  保存
                </button>
                <button
                  className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 text-black"
                  onClick={() => cancelEdit()}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xl font-medium text-black cursor-pointer truncate w-80">{task.title}</p>
              {task.description && (
                <p className="text-lg text-gray-500 break-words w-80 mt-0.5">{task.description}</p>
              )}
            </>
          )}
        </div>
      </div>
      <span
        className="text-xl cursor-pointer hover:bg-gray-200 rounded px-2 text-black"
        onClick={(e) => {
          e.stopPropagation();
          onMove(task);
        }}
      >
        {view === "daily" ? "→" : "←"}
      </span>
    </div>
  );
}

// 组件状态管理
export default function TaskPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [futureTasks, setFutureTasks] = useState<Task[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"daily" | "future">("daily");
  const [isEditingInput, setIsEditingInput] = useState(false);

  const [messages, setMessages] = useState([
    { id: 1, sender: "ai", text: "你好，我是AI助手，有什么可以帮你？" },
  ]);
  const [input, setInput] = useState("");
  const [pendingPlan, setPendingPlan] = useState<{
    tasksDaily?: { title: string; description?: string }[];
    tasksFuture?: { title: string; description?: string }[];
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // 退出登录
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        console.error("Sign out error:", error.message);
      }
    } finally {
      router.replace("/");
    }
  };

  // 接入鼠标和键盘
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", weekday: "short"});

  const tasks = view === "daily" ? dailyTasks : futureTasks;
  const setTasks = view === "daily" ? setDailyTasks : setFutureTasks;

  // 登录校验并加载任务 + 订阅实时
  useEffect(() => {
    let unsubscribed = false;
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        router.replace("/");
        return;
      }
      setUserId(user.id);
      // 拉取任务
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("list", { ascending: true })
        .order("position", { ascending: true });
      if (!unsubscribed) {
        if (error) {
          console.error("Load tasks error:", error.message);
        } else {
          const rows = (data || []) as Task[];
          setDailyTasks(rows.filter((t) => t.list === "daily"));
          setFutureTasks(rows.filter((t) => t.list === "future"));
        }
      }

      // 实时订阅
      const channel = supabase
        .channel("tasks_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
          (payload: RealtimePostgresChangesPayload<Task>) => {
            const type = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
            if (type === "INSERT") {
              const row = payload.new as Task;
              if (row.list === "daily") {
                setDailyTasks((prev) => (prev.some((p) => p.id === row.id) ? prev : insertSorted(prev, row)));
              } else {
                setFutureTasks((prev) => (prev.some((p) => p.id === row.id) ? prev : insertSorted(prev, row)));
              }
            } else if (type === "UPDATE") {
              const row = payload.new as Task;
              // 若更换了 list，需要在两边移动
              setDailyTasks((prev) => {
                const existsInDaily = prev.some((p) => p.id === row.id);
                if (row.list === "daily") {
                  const next = existsInDaily ? prev.map((p) => (p.id === row.id ? row : p)) : insertSorted(prev, row);
                  return sortByPosition(next);
                } else {
                  return prev.filter((p) => p.id !== row.id);
                }
              });
              setFutureTasks((prev) => {
                const existsInFuture = prev.some((p) => p.id === row.id);
                if (row.list === "future") {
                  const next = existsInFuture ? prev.map((p) => (p.id === row.id ? row : p)) : insertSorted(prev, row);
                  return sortByPosition(next);
                } else {
                  return prev.filter((p) => p.id !== row.id);
                }
              });
            } else if (type === "DELETE") {
              const row = payload.old as Task;
              setDailyTasks((prev) => prev.filter((p) => p.id !== row.id));
              setFutureTasks((prev) => prev.filter((p) => p.id !== row.id));
            }
          }
        )
        .subscribe();
      channelRef.current = channel;
    };
    init();
    return () => {
      unsubscribed = true;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [router]);

  // 任务排序
  const insertSorted = (arr: Task[], row: Task) => arr.slice().concat(row).sort((a, b) => a.position - b.position);
  const sortByPosition = (arr: Task[]) => arr.slice().sort((a, b) => a.position - b.position);

  // 添加新任务
  const addTask = async () => {
    if (!userId) return;
    const title = newTaskTitle.trim();
    if (title === "") return;
    const position = (view === "daily" ? dailyTasks.length : futureTasks.length);
    // 构造临时任务对象
    const tempTask: Task = {
      id: `temp-${Date.now()}`, // 临时 ID
      user_id: userId,
      title,
      description: newTaskDesc || null,
      done: false,
      list: view,
      position,
    };
    // 乐观更新本地状态
    if (view === "daily") setDailyTasks((prev) => [...prev, tempTask]);
    else setFutureTasks((prev) => [...prev, tempTask]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setAdding(false);
    // 异步持久化到 Supabase
    const { data, error } = await supabase
      .from("tasks")
      .insert({ user_id: userId, title, description: newTaskDesc || null, done: false, list: view, position })
      .select("*")
      .single();
    if (error) {
      console.error("Add task error:", error.message);
      // 回滚：移除临时任务
      if (view === "daily") setDailyTasks((prev) => prev.filter((t) => t.id !== tempTask.id));
      else setFutureTasks((prev) => prev.filter((t) => t.id !== tempTask.id));
      return;
    }
    const row = data as Task;
    // 替换临时任务为实际任务
    if (view === "daily") setDailyTasks((prev) => prev.map((t) => (t.id === tempTask.id ? row : t)));
    else setFutureTasks((prev) => prev.map((t) => t.id === tempTask.id ? row : t));
  };

  // 保存任务编辑
  const saveEdit = async (id: string) => {
    const nextTitle = editingTitle.trim().slice(0, 30);
    const nextDesc = editingDesc.trim();
    const patch: Pick<Task, "title" | "description"> = {
      title: nextTitle,
      description: nextDesc === "" ? null : nextDesc,
    };

    // 记录旧数据，做失败回滚
    const prevDaily = dailyTasks;
    const prevFuture = futureTasks;

    const applyLocal = () => {
      setDailyTasks((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      setFutureTasks((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    };
    const rollbackLocal = () => {
      setDailyTasks(prevDaily);
      setFutureTasks(prevFuture);
    };

    // 本地乐观更新
    applyLocal();

    // 持久化
    const { error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId!);
    if (error) {
      console.error("Update task error:", error.message);
      rollbackLocal();
      return;
    }
    setEditingId(null);
    setIsEditingInput(false);
  };

  // 取消任务编辑
  const cancelEdit = () => {
    setEditingId(null);
    setIsEditingInput(false);
  };

  // backspace删除任务
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Backspace" && selectedId && !isEditingInput && editingId === null) {
      e.preventDefault();
      // 保存当前任务以便回滚
      const deletedTask = (view === "daily" ? dailyTasks : futureTasks).find((t) => t.id === selectedId);
      // 乐观更新：先移除任务
      if (view === "daily") setDailyTasks((prev) => prev.filter((t) => t.id !== selectedId));
      else setFutureTasks((prev) => prev.filter((t) => t.id !== selectedId));
      setSelectedId(null);
      // 异步删除
      const { error } = await supabase.from("tasks").delete().eq("id", selectedId).eq("user_id", userId!);
      if (error) {
        console.error("Delete task error:", error.message);
        // 回滚：恢复任务
        if (deletedTask) {
          if (view === "daily") setDailyTasks((prev) => [...prev, deletedTask]);
          else setFutureTasks((prev) => [...prev, deletedTask]);
        }
      }
    }
  };

  // 拖拽改变任务顺序
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const activeId = String(active.id);
      const overId = over ? String(over.id) : null;
      const oldIndex = tasks.findIndex((task) => task.id === activeId);
      const newIndex = tasks.findIndex((task) => task.id === overId);
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);
  // 持久化 position
      try {
        await Promise.all(
          newTasks.map((t, idx) =>
            supabase.from("tasks").update({ position: idx }).eq("id", t.id).eq("user_id", userId!)
          )
        );
      } catch (err) {
        console.error("Persist positions error:", err);
      }
    }
  };

  // 完成任务
  const toggleTask = async (id: string) => {
    const list = view;
    const cur = (list === "daily" ? dailyTasks : futureTasks).find((t) => t.id === id);
    if (!cur) return;

    // 记录旧列表以便失败回滚
    const prevDaily = dailyTasks;
    const prevFuture = futureTasks;

    // 本地乐观更新（立即反馈，不等待网络）
    const applyLocal = () => {
      const toggleMap = (taskList: Task[]) => taskList.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      setDailyTasks(toggleMap);
      setFutureTasks(toggleMap);
    };
    const rollbackLocal = () => {
      setDailyTasks(prevDaily);
      setFutureTasks(prevFuture);
    };
    applyLocal();

    // 后台持久化
    const { error } = await supabase
      .from("tasks")
      .update({ done: !cur.done })
      .eq("id", id)
      .eq("user_id", userId!);
    if (error) {
      console.error("Toggle task error:", error.message);
      rollbackLocal();
    }
  };

  // 进入任务编辑
  const startEdit = (id: string, title: string, desc: string) => {
    setEditingId(id);
    setEditingTitle(title);
    setEditingDesc(desc || "");
    setIsEditingInput(true);
  };

  // 迁移任务
  const moveTask = async (task: Task) => {
    const targetList: "daily" | "future" = view === "daily" ? "future" : "daily";
    const targetPos = targetList === "daily" ? dailyTasks.length : futureTasks.length;
    const { error } = await supabase
      .from("tasks")
      .update({ list: targetList, position: targetPos })
      .eq("id", task.id)
      .eq("user_id", userId!);
    if (error) console.error("Move task error:", error.message);
    // 乐观本地移动
    if (targetList === "daily") {
      setFutureTasks((prev) => prev.filter((t) => t.id !== task.id));
      setDailyTasks((prev) => [...prev, { ...task, list: targetList, position: targetPos }]);
    } else {
      setDailyTasks((prev) => prev.filter((t) => t.id !== task.id));
      setFutureTasks((prev) => [...prev, { ...task, list: targetList, position: targetPos }]);
    }
  };

  // 向AI发送信息
  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;
    const userMsg = { id: Date.now(), sender: "user" as const, text: content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAiLoading(true);
    try {
      // 构造上下文消息
      const history = messages.slice(-8).map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content }] }),
      });
      const data = await res.json();
      const aiText: string = data.reply || "(无回复)";
      const aiMsg = { id: Date.now() + 1, sender: "ai" as const, text: aiText };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.plan) {
        setPendingPlan(data.plan);
      } else {
        setPendingPlan(null);
      }
  } catch {
      const errMsg = { id: Date.now() + 2, sender: "ai" as const, text: "AI 调用失败，请稍后重试。" };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  // 确认/取消AI给出的计划
  const confirmPlan = async () => {
    if (!pendingPlan || !userId) return;
    type InsertTask = Omit<Task, "id" | "done" | "created_at" | "updated_at">;
    const inserts: InsertTask[] = [];
    const clamp = (s: string) => (s.length > 30 ? s.slice(0, 30) : s);
    // 计算插入位置
    let dailyPos = dailyTasks.length;
    let futurePos = futureTasks.length;
    if (pendingPlan.tasksDaily) {
      for (const t of pendingPlan.tasksDaily) {
        inserts.push({ user_id: userId, title: clamp(t.title), description: t.description ?? null, list: "daily", position: dailyPos++ });
      }
    }
    if (pendingPlan.tasksFuture) {
      for (const t of pendingPlan.tasksFuture) {
        inserts.push({ user_id: userId, title: clamp(t.title), description: t.description ?? null, list: "future", position: futurePos++ });
      }
    }
    if (inserts.length === 0) {
      setPendingPlan(null);
      return;
    }
    const { data, error } = await supabase
      .from("tasks")
      .insert(inserts.map((x) => ({ ...x, done: false })))
      .select("*");
    if (error) {
      console.error("Insert plan error:", error.message);
      return;
    }
    const rows = (data || []) as Task[];
    const dailyAdded = rows.filter((r) => r.list === "daily");
    const futureAdded = rows.filter((r) => r.list === "future");
    if (dailyAdded.length) setDailyTasks((prev) => sortByPosition([...prev, ...dailyAdded]));
    if (futureAdded.length) setFutureTasks((prev) => sortByPosition([...prev, ...futureAdded]));
    setPendingPlan(null);
  };

  const discardPlan = () => setPendingPlan(null);

  // 开启新对话
  const newConversation = () => {
    setMessages([{ id: Date.now(), sender: "ai", text: "你好，我是AI助手，有什么可以帮你？" }]);
    setPendingPlan(null);
    setInput("");
  };

  // 渲染页面
  return (
    <div className="h-svh w-svw box-border overflow-hidden flex bg-[#d6c7b5] p-4" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Sidebar */}
      <div className="w-1/6 flex flex-col gap-3 text-black font-medium">
        <h1 className="text-[40px] font-bold mt-6 mb-4 text-center w-full">Bullet AI</h1>
        <div className="flex flex-col gap-3 w-full px-10">
          <button
            onClick={() => setView("daily")}
            disabled={view === "daily"}
            className={`text-2xl font-medium transition-colors text-left ${view === "daily" ? "text-black cursor-not-allowed" : "text-gray-500 hover:text-gray-700"}`}
          >
            Today
          </button>
          <button
            onClick={() => setView("future")}
            disabled={view === "future"}
            className={`text-2xl font-medium transition-colors text-left ${view === "future" ? "text-black cursor-not-allowed" : "text-gray-500 hover:text-gray-700"}`}
          >
            Future
          </button>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full py-2 mb-6 rounded-2xl border text-sm font-medium bg-brown-200 text-black-700 text-center hover:shadow-sm"
          >
            退出登录
          </button>
        </div>
      </div>

  {/* Main Content */}
  <div className="flex-1 grid grid-cols-3 gap-4 h-full min-h-0">
        {/* Task List */}
        <div className="col-span-2 bg-[#F5F5F5] rounded-2xl p-6 shadow-lg flex flex-col h-full min-h-0">
          <h2 className="text-[40px] font-bold mb-4 text-gray-800">{view === "daily" ? formattedDate : "Future to-do"}</h2>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      isSelected={selectedId === task.id}
                      onSelect={setSelectedId}
                      onToggle={toggleTask}
                      onEdit={startEdit}
                      onMove={moveTask}
                      view={view}
                      isEditing={editingId === task.id}
                      editingTitle={editingTitle}
                      editingDesc={editingDesc}
                      setEditingTitle={setEditingTitle}
                      setEditingDesc={setEditingDesc}
                      saveEdit={saveEdit}
                      cancelEdit={cancelEdit}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {adding ? (
              <div className="flex flex-col gap-3 mt-6 p-4 border border-black rounded-xl bg-gray-50">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => {
                    if (e.target.value.length <= 30) setNewTaskTitle(e.target.value);
                  }}
                  onFocus={() => setIsEditingInput(true)}
                  onBlur={() => setIsEditingInput(false)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") addTask();
                    if (e.key === "Escape") setAdding(false);
                  }}
                  placeholder="Task title (max 30 chars)"
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6c7b5] focus:border-transparent text-black"
                  autoFocus
                />
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  onFocus={() => setIsEditingInput(true)}
                  onBlur={() => setIsEditingInput(false)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addTask();
                    }
                    if (e.key === "Escape") setAdding(false);
                  }}
                  placeholder="Task description (optional)"
                  rows={3}
                  className="border rounded-lg px-3 py-2 text-sm text-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-[#d6c7b5] focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button onClick={addTask} className="px-4 py-2 text-sm rounded-lg bg-[#d6c7b5] text-white hover:bg-[#c9b8a1] transition-colors font-medium">
                    Add Task
                  </button>
                  <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors font-medium text-black">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="text-gray-400 hover:text-[#d6c7b5] text-sm mt-6 font-medium transition-colors flex items-center gap-1">
                <span className="text-lg">+</span> 点击添加新任务
              </button>
            )}
          </div>
        </div>

        {/* Chat Box */}
        <div className="bg-[#F5F5F5] rounded-2xl p-6 shadow-lg flex flex-col h-full min-h-0 relative">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">我的 AI 管家</h3>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${msg.sender === "user" ? "ml-auto bg-[#d6c7b5] text-white" : "mr-auto bg-gray-200 text-gray-800"}`}
              >
                {msg.text}
              </div>
            ))}
            {pendingPlan && (
              <div className="p-3 border rounded-xl bg-gray-50 text-sm text-gray-700">
                <div className="font-medium mb-2">是否将以下任务添加到列表？</div>
                {pendingPlan.tasksDaily && pendingPlan.tasksDaily.length > 0 && (
                  <div className="mb-2">
                    <div className="text-gray-600 mb-1">今日任务：</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {pendingPlan.tasksDaily.map((t, i) => (
                        <li key={`d-${i}`}>
                          <span className="font-medium">{t.title}</span>
                          {t.description ? <span className="text-gray-500"> — {t.description}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pendingPlan.tasksFuture && pendingPlan.tasksFuture.length > 0 && (
                  <div className="mb-2">
                    <div className="text-gray-600 mb-1">未来任务：</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {pendingPlan.tasksFuture.map((t, i) => (
                        <li key={`f-${i}`}>
                          <span className="font-medium">{t.title}</span>
                          {t.description ? <span className="text-gray-500"> — {t.description}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button onClick={confirmPlan} className="px-3 py-1 rounded bg-[#d6c7b5] text-white hover:bg-[#c9b8a1]">确认添加</button>
                  <button onClick={discardPlan} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-black">取消</button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsEditingInput(true)}
              onBlur={() => setIsEditingInput(false)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="请提出您的需求..."
              rows={1}
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6c7b5] focus:border-transparent resize-none overflow-y-auto text-black"
            />

            <button onClick={sendMessage} disabled={aiLoading} className="bg-[#d6c7b5] text-white px-4 py-2 rounded-xl hover:bg-[#c9b8a1] transition-colors font-medium disabled:opacity-60">
              {aiLoading ? "请您稍等..." : "发送"}
            </button>
            <button onClick={newConversation} className="bg-[#d6c7b5] text-white px-4 py-2 rounded-xl hover:bg-[#c9b8a1] transition-colors font-medium">
              +
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
