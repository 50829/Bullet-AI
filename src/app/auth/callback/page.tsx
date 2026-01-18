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
        // 检查 URL 参数
        const url = new URL(window.location.href);
        const error_description = url.searchParams.get("error_description");
        
        // 如果有错误参数，说明认证失败
        if (error_description) {
          setMsg(`登录失败：${decodeURIComponent(error_description)}`);
          return;
        }

        // 检查是否有会话
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("getSession error:", error.message);
          setMsg(`获取会话失败：${error.message}`);
          return;
        }

        if (session) {
          // 检查是否有昵称
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", session.user.id)
            .single();
          
          if (!profile?.username) {
            // 没有昵称，跳转到昵称设置页面
            setMsg("登录成功，请设置昵称…");
            router.replace("/username");
          } else {
            // 有昵称，跳转到主页面
            setMsg("登录成功，正在跳转…");
            router.replace("/main");
          }
        } else {
          // 没有会话，可能需要重定向到登录页
          setMsg("未获取到会话，正在跳转到登录页…");
          setTimeout(() => {
            router.replace("/login");
          }, 2000);
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error("Auth callback exception:", errorMsg);
        setMsg(`处理登录时出现问题：${errorMsg}`);
        setTimeout(() => {
          router.replace("/login");
        }, 3000);
      }
    };

    run();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-orange-100">
      <div className="bg-[#efeeeb] rounded-[28px] shadow-lg p-8 text-center w-full max-w-md mx-4">
        <p className="text-gray-700">{msg}</p>
      </div>
    </div>
  );
}