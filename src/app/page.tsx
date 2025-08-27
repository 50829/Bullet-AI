"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#d6c7b5]">
      <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-700 mb-3">欢迎来到 Bullet + AI</h1>
        <p className="text-gray-600 mb-8">这是一个简单的欢迎页。点击下方按钮进入任务页面。</p>
        <Link
          href="/task-ai"
          className="inline-block px-6 py-3 rounded-xl bg-[#d6c7b5] text-white font-medium hover:bg-[#c9b8a1] transition-colors"
        >
          前往任务页
        </Link>
      </div>
    </main>
  );
}