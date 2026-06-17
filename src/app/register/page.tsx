// RegisterPage.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from '../context/LanguageContext';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 兼容旧主题类，注册页使用统一 calm 外观
  useEffect(() => {
    const root = document.documentElement;
    // 移除所有主题类
    root.className = root.className.split(' ').filter(cls => !cls.startsWith('theme-')).join(' ').trim();
  }, []);

  // 检查密码是否匹配
  const isPasswordMatch = password === confirmPassword && password !== "";

  // 检查密码强度
  const isPasswordStrong = (password: string): boolean => {
    // 至少8位，包含大小写字母、数字和特殊字符
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(password);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // 检查密码是否一致
    if (password !== confirmPassword) {
      setMessage(t("passwordMismatch"));
      setLoading(false);
      return;
    }

    // 检查密码强度
    if (!isPasswordStrong(password)) {
      setMessage(t("passwordTooWeak") || "密码太弱，请使用至少8位，包含大小写、数字和特殊字符。");
      setLoading(false);
      return;
    }

    // 检查密码是否为空
    if (!password || !confirmPassword) {
      setMessage(t("pleaseEnterPassword") || "请输入密码");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        console.error("Registration error:", error); // 记录详细错误到控制台
        // 给用户一个通用的提示
        setMessage(t("registrationFailedGeneric") || "注册失败，请稍后再试或检查您的输入。");
        return;
      }

      // 检查是否需要邮箱确认
      if (data.user?.identities?.length === 0) {
        setMessage(t("emailAlreadyRegistered") || "该邮箱已被注册，请检查邮箱或尝试登录。");
        return;
      }

      router.push("/login");

    } catch (err) {
      console.error("Unexpected registration error:", err); // 记录详细错误到控制台
      setMessage(t("registrationFailedGeneric") || "注册过程中发生未知错误，请稍后再试。"); // 通用用户提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-8 text-center shadow-sm mx-4">
        <h1 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">{t("registerTitle")}</h1>
        <form onSubmit={handleRegister} className="space-y-3 mb-6 text-left">
          <label className="block text-sm text-[var(--color-text-primary)]">{t("setEmail")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border-muted)] px-4 py-2 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder={t("confirmEmailPlaceholder")}
            disabled={loading}
            required
          />
          <label className="block text-sm text-[var(--color-text-primary)]">{t("setPassword")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-lg border ${password && (!isPasswordMatch || !isPasswordStrong(password)) ? 'border-red-500' : 'border-[var(--color-border-muted)]'} px-4 py-2 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]`}
            placeholder={t("setPasswordPlaceholder")}
            disabled={loading}
            required
          />
          {/* 密码强度提示 */}
          {password && (
            <div className="mt-1">
              {!isPasswordStrong(password) && (
                <span className="text-xs text-red-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t("passwordTooWeak") || "密码太弱，请使用至少8位，包含大小写、数字和特殊字符。"}
                </span>
              )}
            </div>
          )}
          <label className="block text-sm text-[var(--color-text-primary)] mt-3">{t("confirmPassword")}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full rounded-lg border ${confirmPassword && !isPasswordMatch ? 'border-red-500' : 'border-[var(--color-border-muted)]'} px-4 py-2 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]`}
            placeholder={t("confirmPasswordPlaceholder")}
            disabled={loading}
            required
          />
          {/* 密码匹配状态提示 */}
          {confirmPassword && (
            <div className="flex items-center mt-1">
              {!isPasswordMatch && (
                <span className="text-xs text-red-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t("passwordMismatch")}
                </span>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !isPasswordMatch || !isPasswordStrong(password)}
            className="mt-4 w-full rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2.5 font-bold text-[var(--color-text-on-primary)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("registering") : t("register")}
          </button>
        </form>
        <p className="text-sm">
          {t("alreadyAccount")}{" "}
          <a href="/login" className="text-[var(--color-primary)] hover:underline">
            {t("login")} {/* 使用专门的“去登录”翻译 */}
          </a>
        </p>
        {message && <p className="text-sm mt-4 text-red-500">{message}</p>}
      </div>
    </main>
  );
}
