"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AuthCallback() {
  const router = useRouter();
  const called = useRef(false);
  const [msg, setMsg] = useState("正在处理登录…");

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const run = async () => {
      try {
        // 从 URL 中获取 token 和 type
        const url = new URL(window.location.href);
        const token = url.searchParams.get("token");
        const type = url.searchParams.get("type") || "email";
        const email = url.searchParams.get("email"); // 假设邮箱通过 URL 传递

        if (token && email) {
          // 验证 OTP
          const { data: { session }, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: type as "email",
          });
          if (error) {
            console.error("verifyOtp error:", error.message);
            setMsg(`验证失败：${error.message}`);
            return;
          }
          if (session) {
            setMsg("登录成功，正在跳转…");
            router.replace("/task-ai");
            return;
          }
        }

        // 尝试获取已有会话
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("getSession error:", error.message);
          setMsg("未获取到会话，正在跳转…");
        }
        if (!session) {
          setMsg("未获取到会话，请重试");
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error("Auth callback exception:", errorMsg);
        setMsg(`处理登录时出现问题：${errorMsg}`);
      } finally {
        router.replace("/task-ai");
      }
    };
    run();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#d6c7b5]">
      <div className="bg-white rounded-2xl shadow p-6 text-gray-700">{msg}</div>
    </div>
  );
}
