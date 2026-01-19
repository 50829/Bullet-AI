// RegisterPage.tsx
"use client";
import { useState } from "react";
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

      // 注册成功，提示用户去登录
      setMessage(t("registrationSuccess") || "注册成功！请前往登录页面输入邮箱和密码登录。");

      // 等待 1.5 秒后跳转到登录页
      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (err) {
      console.error("Unexpected registration error:", err); // 记录详细错误到控制台
      setMessage(t("registrationFailedGeneric") || "注册过程中发生未知错误，请稍后再试。"); // 通用用户提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#efeeeb] text-[#003049]">
      <div className="bg-transparent rounded-3xl p-8 text-center w-full max-w-md mx-4">
        <h1 className="text-3xl font-bold text-[#003049] mb-6">{t("registerTitle")}</h1>
        <form onSubmit={handleRegister} className="space-y-3 mb-6 text-left">
          <label className="block text-sm text-gray-700">{t("setEmail")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#003049] rounded-3xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#003049] text-[#003049]"
            placeholder={t("confirmEmailPlaceholder")}
            disabled={loading}
            required
          />
          <label className="block text-sm text-gray-700">{t("setPassword")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full border ${password && (!isPasswordMatch || !isPasswordStrong(password)) ? 'border-red-500' : 'border-[#003049]'} rounded-3xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#003049] text-[#003049]`}
            placeholder={t("setPasswordPlaceholder")}
            disabled={loading}
            required
          />
          {/* 密码强度提示 */}
          {password && (
            <div className="mt-1">
              {!isPasswordStrong(password) ? (
                <span className="text-xs text-red-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t("passwordTooWeak") || "密码太弱，请使用至少8位，包含大小写、数字和特殊字符。"}
                </span>
              ) : (
                <span className="text-xs text-green-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {t("passwordStrong") || "密码强度良好"}
                </span>
              )}
            </div>
          )}
          <label className="block text-sm text-gray-700 mt-3">{t("confirmPassword")}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full border ${confirmPassword && !isPasswordMatch ? 'border-red-500' : 'border-[#003049]'} rounded-3xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#003049] text-[#003049]`}
            placeholder={t("confirmPasswordPlaceholder")}
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
                  {t("passwordMismatch")}
                </span>
              ) : (
                <span className="text-xs text-green-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {t("passwordMatch")}
                </span>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !isPasswordMatch || !isPasswordStrong(password)}
            className="w-full mt-4 px-4 py-2.5 rounded-3xl bg-[#003049] text-white font-bold border-2 border-transparent hover:bg-white hover:text-[#003049] hover:border-[#003049] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("registering") : t("register")}
          </button>
        </form>
        <p className="text-sm">
          {t("alreadyAccount")}{" "}
          <a href="/login" className="text-[#B8860B] hover:underline">
            {t("login")} {/* 使用专门的“去登录”翻译 */}
          </a>
        </p>
        {message && <p className={`text-sm mt-4 ${message.includes("成功") || message.includes("success") ? "text-green-500" : "text-red-500"}`}>{message}</p>}
      </div>
    </main>
  );
}