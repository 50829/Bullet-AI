"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 优先使用浏览器当前地址，确保本地开发跳回本地；仅在无 window 时回退到环境变量
  const getOrigin = () => (typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? ""));

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage("请输入邮箱地址");
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${getOrigin()}/auth/callback`,
        },
      });
      if (error) {
        setMessage(`发送验证码失败：${error.message}`);
        console.error("signInWithOtp error:", error.message);
      } else {
        setMessage("验证码已发送，请检查您的邮箱");
        setStep("code");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setMessage(`发生错误：${errorMsg}`);
      console.error("send code exception:", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setMessage("请输入验证码");
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const { data: { session }, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) {
        setMessage(`验证码验证失败：${error.message}`);
        console.error("verifyOtp error:", error.message);
      } else if (session) {
        setMessage("登录成功，正在跳转…");
        window.location.href = "/task-ai";
      } else {
        setMessage("未获取到会话，请重试");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setMessage(`发生错误：${errorMsg}`);
      console.error("verify code exception:", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "github") => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getOrigin()}/auth/callback`,
        queryParams: provider === "github" ? { prompt: "login" } : undefined,
      },
    });
    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  };

  return (
  <main className="min-h-screen flex items-center justify-center bg-[var(--surface-soft)] text-[var(--text-primary)]">
      <div className="bg-white rounded-2xl shadow-lg p-10 text-center w-full max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">登录 BulletAI</h1>
        <p className="text-gray-600 mb-6">使用邮箱验证码或第三方账号登录，登录后将跳转到任务面板</p>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-3 mb-6 text-left">
            <label className="block text-sm text-gray-700">邮箱</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]"
              placeholder="you@example.com"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-2 rounded-xl bg-[var(--brand-color)] text-white hover:bg-[var(--brand-color-hover)] disabled:opacity-60"
            >
              {loading ? "发送中…" : "发送验证码"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-3 mb-6 text-left">
            <label className="block text-sm text-gray-700">验证码</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]"
              placeholder="请输入验证码"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-2 rounded-xl bg-[var(--brand-color)] text-white hover:bg-[var(--brand-color-hover)] disabled:opacity-60"
            >
              {loading ? "验证中…" : "验证并登录"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full mt-2 text-blue-500 hover:underline"
              disabled={loading}
            >
              返回重新发送验证码
            </button>
          </form>
        )}

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-500">或</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="grid gap-3">
          <button
            onClick={() => signInWithProvider("github")}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl border hover:bg-gray-50 text-black"
          >
            使用 GitHub 登录
          </button>
        </div>

        {message && <p className="text-sm text-red-500 mt-4">{message}</p>}
      </div>
    </main>
  );
}
