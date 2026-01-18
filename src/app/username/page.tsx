"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from '../context/LanguageContext';

export default function UsernamePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUserAndUsername = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        // 检查是否已有昵称
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", session.user.id)
          .single();

        if (profile?.username) {
          // 已有昵称，直接跳转到主页面
          router.push("/main");
          return;
        }

        setChecking(false);
      } catch (error) {
        console.error("检查用户信息失败:", error);
        setChecking(false);
      }
    };

    checkUserAndUsername();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage("请输入昵称");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // 检查昵称是否已被使用
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username.trim())
        .single();

      if (existing) {
        setMessage("该昵称已被使用，请选择其他昵称");
        setLoading(false);
        return;
      }

      // 插入或更新用户名
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: session.user.id,
          username: username.trim(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (error) {
        console.error("保存昵称失败:", error);
        setMessage("保存失败，请稍后再试");
        setLoading(false);
        return;
      }

      // 成功，跳转到主页面
      router.push("/main");
    } catch (err) {
      console.error("设置昵称时出错:", err);
      setMessage("发生错误，请稍后再试");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-orange-100">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center w-full max-w-md mx-4 border border-orange-200">
          <p className="text-gray-700">检查中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-orange-100 text-gray-800">
      <div className="bg-[#efeeeb] rounded-[28px] shadow-lg p-8 w-full max-w-md mx-4">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          我该如何称呼您
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          听说每一个BulletAI用户，都成为了自己梦想中的样子
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-3xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800"
              placeholder="请输入用户名"
              disabled={loading}
              maxLength={20}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full mt-4 px-4 py-2.5 rounded-3xl bg-black text-white font-bold border-2 border-transparent hover:bg-white hover:text-amber-500 hover:border-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "保存中..." : "保存并继续"}
          </button>
        </form>
        {message && <p className="text-sm text-orange-400 mt-4 text-center">{message}</p>}
      </div>
    </main>
  );
}
