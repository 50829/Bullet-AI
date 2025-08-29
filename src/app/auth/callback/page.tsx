"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

// 避免该路由在构建阶段被预渲染（Vercel 构建环境可能没有注入 NEXT_PUBLIC_* 变量）
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
        // 兼容两种回调：
        // 1) OAuth PKCE: URL 上带 ?code=xxx，需要交换 session
        // 2) 魔法链接/implicit: URL hash 带 token，detectSessionInUrl + getSession 即可
        const { error: exchError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exchError) {
          // 不是所有流程都会有 code，非致命，继续尝试读取本地 session
          console.debug("exchangeCodeForSession skipped:", exchError.message);
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("getSession error:", error.message);
        }
        if (!session) {
          // 未拿到会话，给出提示（仍然尝试跳转，由受保护页二次校验）
          setMsg("未获取到会话，正在跳转…");
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Auth callback exception:", msg);
        setMsg("处理登录时出现问题，正在跳转…");
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
