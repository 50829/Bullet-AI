// RegisterPage.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setMessage("注册失败：" + error.message);
        return;
      }

      // 检查是否需要邮箱确认
      if (data.user?.identities?.length === 0) {
        setMessage("该邮箱已被注册，请检查邮箱或尝试登录。");
        return;
      }

      // 注册成功，提示用户去登录
      setMessage("注册成功！请前往登录页面输入邮箱和密码登录。");

      // 等待 1.5 秒后跳转到登录页
      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (err) {
      setMessage("发生错误：" + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-orange-100 text-gray-800">
      <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-3xl shadow-lg p-8 text-center w-full max-w-md mx-4 border border-orange-200">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">注册 BulletAI</h1>
        <form onSubmit={handleRegister} className="space-y-3 mb-6 text-left">
          <label className="block text-sm text-gray-700">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800"
            placeholder="you@example.com"
            disabled={loading}
            required
          />
          <label className="block text-sm text-gray-700">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800"
            placeholder="请输入密码"
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 px-4 py-2.5 rounded-xl bg-black text-white font-bold border-2 border-transparent hover:bg-white hover:text-amber-500 hover:border-black transition-all duration-300"
          >
            {loading ? "注册中…" : "注册"}
          </button>
        </form>
        <p className="text-sm">
          已有账号？{" "}
          <a href="/login" className="text-amber-500 hover:underline">
            去登录
          </a>
        </p>
        {message && <p className="text-sm text-red-500 mt-4">{message}</p>}
      </div>
    </main>
  );
}