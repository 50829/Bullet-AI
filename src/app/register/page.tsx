// RegisterPage.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 检查密码是否匹配
  const isPasswordMatch = password === confirmPassword && password !== "";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // 检查密码是否一致
    if (password !== confirmPassword) {
      setMessage("两次输入的密码不一致，请重新输入");
      setLoading(false);
      return;
    }

    // 检查密码是否为空
    if (!password || !confirmPassword) {
      setMessage("请输入密码");
      setLoading(false);
      return;
    }

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
          <label className="block text-sm text-gray-700">设置密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full border ${password && !isPasswordMatch ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800`}
            placeholder="请输入密码"
            disabled={loading}
            required
          />
          <label className="block text-sm text-gray-700">确认密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full border ${confirmPassword && !isPasswordMatch ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800`}
            placeholder="请再次输入密码"
            disabled={loading}
            required
          />
          {/* 密码匹配状态提示 */}
          {confirmPassword && (
            <div className="flex items-center mt-1">
              {!isPasswordMatch ? (
                <span className="text-xs text-red-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  密码不匹配
                </span>
              ) : (
                <span className="text-xs text-green-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  密码匹配
                </span>
              )}
            </div>
          )}
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