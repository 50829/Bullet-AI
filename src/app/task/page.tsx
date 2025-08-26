"use client";
import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
// Sortable Task Item Component
function SortableTaskItem({
  task,
  isSelected,
  onSelect,
  onToggle,
  onEdit,
  onMove,
  view,
  isEditing,
  editingField,
  editingText,
  setEditingText,
  saveEdit,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center justify-between p-2 rounded cursor-pointer touch-none ${isSelected ? "bg-gray-100" : ""}`}
      onClick={() => onSelect(task.id)}
   >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.done}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className="mt-1"
        />
        <div>
          {isEditing && editingField === "title" ? (
            <input
              type="text"
              value={editingText}
              onChange={(e) => {
                if (e.target.value.length <= 30) setEditingText(e.target.value);
              }}
              onBlur={() => saveEdit(task.id)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") saveEdit(task.id);
              }}
              autoFocus
              className="border rounded px-1 text-sm truncate w-64"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              className="font-medium cursor-pointer truncate w-64"
              onDoubleClick={(e) => {
                e.stopPropagation();
                onEdit(task.id, "title", task.title);
              }}
            >
              {task.title}
            </p>
          )}

          {isEditing && editingField === "description" ? (
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={() => saveEdit(task.id)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit(task.id);
                }
              }}
              autoFocus
              rows={2}
              className="border rounded px-1 text-xs text-gray-500 w-64 resize-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            task.description && (
              <p
                className="text-sm text-gray-500 cursor-pointer break-words w-64"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onEdit(task.id, "description", task.description);
                }}
              >
                {task.description}
              </p>
            )
          )}
        </div>
      </div>
      <span
        className="text-xl cursor-pointer hover:bg-gray-200 rounded px-2"
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

export default function TaskPage() {
  const [dailyTasks, setDailyTasks] = useState([
    { id: "1", title: "this is a task title", description: "task description is here", done: true },
    { id: "2", title: "this is a task title", description: "task description is here", done: true },
  ]);
  const [futureTasks, setFutureTasks] = useState([
    { id: "f1", title: "future task title", description: "future task description", done: false },
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"daily" | "future">("daily");
  const [isEditingInput, setIsEditingInput] = useState(false);

  const [messages, setMessages] = useState([
    { id: 1, sender: "ai", text: "你好，我是AI助手，有什么可以帮你？" },
  ]);
  const [input, setInput] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });

  const tasks = view === "daily" ? dailyTasks : futureTasks;
  const setTasks = view === "daily" ? setDailyTasks : setFutureTasks;

  const addTask = () => {
    if (newTaskTitle.trim() !== "") {
      const newTask = {
        id: Date.now().toString(),
        title: newTaskTitle,
        description: newTaskDesc,
        done: false,
      };
      if (view === "daily") {
        setDailyTasks([...dailyTasks, newTask]);
      } else {
        setFutureTasks([...futureTasks, newTask]);
      }
      setNewTaskTitle("");
      setNewTaskDesc("");
      setAdding(false);
    }
  };

  const saveEdit = (id: string) => {
    const updateTasks = (taskList) => taskList.map((t) => (t.id === id ? { ...t, [editingField as string]: editingText } : t));
    if (view === "daily") setDailyTasks(updateTasks(dailyTasks));
    else setFutureTasks(updateTasks(futureTasks));
    setEditingId(null);
    setEditingText("");
    setEditingField(null);
    setIsEditingInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Backspace" && selectedId && !isEditingInput && editingId === null) {
      e.preventDefault();
      if (view === "daily") setDailyTasks(dailyTasks.filter((t) => t.id !== selectedId));
      else setFutureTasks(futureTasks.filter((t) => t.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id);
      const newIndex = tasks.findIndex((task) => task.id === over.id);
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);
    }
  };

  const toggleTask = (id: string) => {
    const toggleTasks = (taskList) => taskList.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    if (view === "daily") setDailyTasks(toggleTasks(dailyTasks));
    else setFutureTasks(toggleTasks(futureTasks));
  };

  const startEdit = (id: string, field: string, value: string) => {
    setEditingId(id);
    setEditingField(field);
    setEditingText(value);
    setIsEditingInput(true);
  };

  const moveTask = (task) => {
    if (view === "daily") {
      setDailyTasks(dailyTasks.filter((t) => t.id !== task.id));
      setFutureTasks([...futureTasks, task]);
    } else {
      setFutureTasks(futureTasks.filter((t) => t.id !== task.id));
      setDailyTasks([...dailyTasks, task]);
    }
  };

  const sendMessage = () => {
    if (input.trim() === "") return;
    const newMsg = { id: Date.now(), sender: "user", text: input } as const;
    setMessages([...messages, newMsg]);
    setInput("");
    setTimeout(() => {
      const aiReply = { id: Date.now() + 1, sender: "ai", text: "这是AI的回复" } as const;
      setMessages((prev) => [...prev, aiReply]);
    }, 800);
  };

  return (
    <div className="h-screen w-screen flex bg-[#d6c7b5] p-4" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Sidebar */}
      <div className="w-1/6 flex flex-col items-center gap-6 text-black font-medium">
        <h1 className="text-2xl font-bold mb-4">Bullet + AI</h1>
        <div className="flex flex-col gap-3 w-full px-2">
          <button
            onClick={() => setView("daily")}
            disabled={view === "daily"}
            className={`w-full py-2 rounded-xl border text-sm font-medium transition-colors ${view === "daily" ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-white hover:bg-gray-100 hover:shadow-sm"}`}
          >
            Daily Log
          </button>
          <button
            onClick={() => setView("future")}
            disabled={view === "future"}
            className={`w-full py-2 rounded-xl border text-sm font-medium transition-colors ${view === "future" ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-white hover:bg-gray-100 hover:shadow-sm"}`}
          >
            Future Log
          </button>
            <Link
          href="/"
          className={`w-full py-2 rounded-xl border text-sm font-medium bg-brown-200 text-black-700 text-center hover:shadow-sm`}
        >
          返回主页面
        </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-3 gap-4">
        {/* Task List */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">{view === "daily" ? formattedDate : "Future List"}</h2>

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
                    editingField={editingField}
                    editingText={editingText}
                    setEditingText={setEditingText}
                    saveEdit={saveEdit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {adding ? (
            <div className="flex flex-col gap-3 mt-6 p-4 border rounded-xl bg-gray-50">
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
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6c7b5] focus:border-transparent"
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
                <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors font-medium">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="text-gray-400 hover:text-[#d6c7b5] text-sm mt-6 font-medium transition-colors flex items-center gap-1">
              <span className="text-lg">+</span> Add a task
            </button>
          )}
        </div>

        {/* Chat Box */}
        <div className="bg-white rounded-2xl p-6 shadow-lg flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">AI Assistant</h3>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-96">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${msg.sender === "user" ? "ml-auto bg-[#d6c7b5] text-white" : "mr-auto bg-gray-100 text-gray-800"}`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsEditingInput(true)}
              onBlur={() => setIsEditingInput(false)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Type a message..."
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6c7b5] focus:border-transparent"
            />
            <button onClick={sendMessage} className="bg-[#d6c7b5] text-white px-4 py-2 rounded-xl hover:bg-[#c9b8a1] transition-colors font-medium">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
