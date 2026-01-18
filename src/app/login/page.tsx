// app/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient"; // 更新路径
import { useLanguage } from '../context/LanguageContext'; // 更新路径

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage(); // 从 LanguageContext 获取翻译函数
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const getOrigin = () =>
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage(t("passwordMismatch")); // 重用注册页的错误信息
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(`登录失败：${error.message}`);
      } else {
        // 检查是否有昵称
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", session.user.id)
            .single();
          
          if (!profile?.username) {
            // 没有昵称，跳转到昵称设置页面
            router.push("/username");
          } else {
            // 有昵称，跳转到主页面
            router.push("/main");
          }
        } else {
          router.push("/main");
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage(`错误：${errorMsg}`);
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
    // 注意：OAuth 登录不会返回到当前函数，而是重定向到回调页面
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-orange-100 text-gray-800 relative">
      <div className="bg-transparent rounded-3xl p-8 text-center w-full max-w-md mx-4">
        {/* 移除了语言切换按钮 */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6">{t("loginTitle")}</h1>

        {/* Google 登录 */}
        <button
          onClick={() => signInWithProvider("google")}
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-3xl border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-3 mb-3 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
          </svg>
          {t("googleLogin")}
        </button>

        {/* GitHub 登录 */}
        <button
          onClick={() => signInWithProvider("github")}
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-3xl border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-3 mb-3 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          {t("githubLogin")}
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-500">{t("or")}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* 邮箱+密码登录 */}
        <form onSubmit={handleLogin} className="space-y-3 mb-6 text-left">
          <label className="block text-sm text-gray-700">{t("emailLabel")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-3xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800"
            placeholder={t("emailPlaceholder")}
            disabled={loading}
          />
          <label className="block text-sm text-gray-700">{t("passwordLabel")}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-3xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800"
            placeholder={t("passwordPlaceholder")}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 px-4 py-2.5 rounded-3xl bg-black text-white font-bold border-2 border-transparent hover:bg-white hover:text-amber-500 hover:border-black transition-all duration-300"
          >
            {loading ? t("loggingIn") : t("login")}
          </button>
        </form>

        <p className="text-sm">
          <a href="/register" className="text-amber-500 hover:underline">
            {t("registerTip")}
          </a>
        </p>

        {message && <p className="text-sm text-orange-400 mt-4">{message}</p>}
      </div>
    </main>
  );
}