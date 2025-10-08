"use client";
import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Edit, Trash2, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { GoalModal } from "../components/GoalModal";
import { HabitModal } from "../components/HabitModal";

type Goal = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  created_at: string;
};

type Habit = {
  id: number;
  name: string;
  description: string | null;
  frequency: string;
  color: string | null;
  created_at: string;
};

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState("我的习惯");
  const tabs = ["今日待办", "近期目标", "我的习惯"];
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  const fetchData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data: goalData } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: habitData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setGoals(goalData || []);
    setHabits(habitData || []);
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm("确定要删除这个目标吗？")) return;
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      console.error("删除目标失败", error);
      alert("删除失败");
    } else {
      fetchData();
    }
  };

  const handleDeleteHabit = async (id: number) => {
    if (!confirm("确定要删除这个习惯吗？")) return;
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (error) {
      console.error("删除习惯失败", error);
      alert("删除失败");
    } else {
      fetchData();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">我的目标</h2>
          <p className="text-gray-500 mt-1">规划未来，成就更好的自己</p>
        </div>
        <Button onClick={() => activeTab === "我的习惯" ? setIsHabitModalOpen(true) : setIsGoalModalOpen(true)}>
          + 新建{activeTab === "我的习惯" ? "习惯" : "目标"}
        </Button>
      </div>

      <div className="flex space-x-4 border-b mb-6">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-1 font-medium transition-colors duration-200 ${activeTab === tab ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "今日待办" && (
          <div className="space-y-4">
            {goals.filter(g => g.type === "今日待办").map(goal => (
              <Card key={goal.id}>
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-bold">{goal.title}</h4>
                    <p className="text-sm text-gray-500">{goal.description}</p>
                  </div>
                  <div className="flex space-x-3 text-gray-400">
                    <Edit size={18} className="cursor-pointer hover:text-gray-600" />
                    <Trash2 size={18} className="cursor-pointer hover:text-red-500" onClick={() => handleDeleteGoal(goal.id)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "近期目标" && (
          <div className="space-y-4">
            {goals.filter(g => g.type === "近期目标").map(goal => (
              <Card key={goal.id}>
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-bold">{goal.title}</h4>
                    <p className="text-sm text-gray-500">{goal.description}</p>
                  </div>
                  <div className="flex space-x-3 text-gray-400">
                    <Edit size={18} />
                    <Trash2 size={18} className="cursor-pointer hover:text-red-500" onClick={() => handleDeleteGoal(goal.id)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "我的习惯" && (
          <div className="space-y-4">
            {habits.map(habit => (
              <Card key={habit.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center mb-2">
                      <h4 className="font-bold text-lg text-gray-800">{habit.name}</h4>
                      <span className="ml-3 bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-md">
                        {habit.frequency}
                      </span>
                    </div>
                    <p className="text-gray-500 mb-3">{habit.description}</p>
                    <div className="flex items-center text-green-600">
                      <CheckCircle size={16} />
                      <span className="ml-2 text-sm">已打卡 0 次</span>
                    </div>
                  </div>
                  <div className="flex space-x-3 text-gray-400">
                    <Edit size={18} className="cursor-pointer hover:text-gray-600" />
                    <Trash2 size={18} className="cursor-pointer hover:text-red-500" onClick={() => handleDeleteHabit(habit.id)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSuccess={fetchData}
      />

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
