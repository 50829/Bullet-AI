"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("登录邮件已发送，请查收邮箱。");
    }
  };

  const signInWithProvider = async (provider: "google" | "github") => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#d6c7b5]">
      <div className="bg-white rounded-2xl shadow-lg p-10 text-center w-full max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">登录 Bullet + AI</h1>
        <p className="text-gray-600 mb-6">使用邮箱或第三方账号登录，成功后将跳转到 /task-ai</p>

        <form onSubmit={signInWithEmail} className="space-y-3 mb-6 text-left">
          <label className="block text-sm text-gray-700">邮箱</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#d6c7b5]"
            placeholder="you@example.com"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2 rounded-xl bg-[#d6c7b5] text-white hover:bg-[#c9b8a1] disabled:opacity-60"
          >
            发送登录邮件
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-500">或</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="grid gap-3">
          <button
            onClick={() => signInWithProvider("google")}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl border hover:bg-gray-50"
          >
            使用 Google 登录
          </button>
          <button
            onClick={() => signInWithProvider("github")}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl border hover:bg-gray-50"
          >
            使用 GitHub 登录
          </button>
        </div>

        {message && <p className="text-sm text-red-500 mt-4">{message}</p>}
      </div>
    </main>
  );
}