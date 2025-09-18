'use client';
import React from 'react';
import Link from 'next/link';

/* ---------------- SVG 图标 ---------------- */
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 7V3M16 7V3M3 11H21M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const BookIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 19.5C4 18.1193 5.11929 17 6.5 17H20M4 4.5C4 5.88071 5.11929 7 6.5 7H20V17H6.5C5.11929 17 4 15.8807 4 14.5V4.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ---------------- 主页面 ---------------- */
export default function BulletAILandingPage() {
  return (
    <div className="bg-[#F8F5F2] font-sans text-[#333]">
      {/* ****** Header ****** */}
      <header className="sticky top-0 z-50 bg-[#F8F5F2]/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#" className="flex items-center gap-2 text-xl font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-300">
              <BookIcon className="h-4 w-4 text-gray-700"/>
            </div>
            <span>BulletAI</span>
          </a>

          {/* 导航锚点：平滑滚动 */}
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-black">功能特色</a>
            <a href="#preview" className="text-sm text-gray-600 hover:text-black">产品预览</a>
            <a href="#testimonials" className="text-sm text-gray-600 hover:text-black">用户评价</a>
            <a href="#" className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100">EN</a>
          </nav>

          <Link
            href="/login"
            className="hidden rounded-lg bg-[#E9E2D9] px-4 py-2 text-sm font-medium hover:bg-[#dcd3c8] md:block"
          >
            开始使用
          </Link>
        </div>
      </header>

      <main>
        {/* ****** Hero ****** */}
        <section id="hero" className="min-h-screen flex items-center justify-center py-24 text-center">
          <div className="container mx-auto max-w-3xl px-4">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-[#E9E2D9] px-4 py-1 text-sm">
              <StarIcon className="h-4 w-4 text-gray-700"/>
              子弹笔记与AI的完美融合
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">
              让每一天都 <span className="rounded-lg bg-[#C8B5A6] px-2 py-1 text-white">聚焦高效</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
              BulletAI 结合子弹笔记的高效结构与AI助手的智能支持，创造无缝的规划与日志系统。从日常记录到长远目标，一切尽在掌控。
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/login"
                className="rounded-lg bg-white px-6 py-3 font-semibold shadow-md transition hover:bg-gray-50"
              >
                免费开始使用 &rarr;
              </Link>
              <a href="#" className="rounded-lg border border-gray-300 bg-transparent px-6 py-3 font-semibold transition hover:bg-gray-50">
                观看演示
              </a>
            </div>
            <p className="mt-6 text-sm text-gray-500">已有 30,000+ 用户选择我们</p>
          </div>
        </section>

        {/* ****** Features ****** */}
        <section id="features" className="min-h-screen bg-white flex items-center py-20">
          <div className="container mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-4xl font-bold">为什么选择 BulletAI?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">五大核心功能，重新定义您的规划与记录体验</p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-8 text-left shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E9E2D9]">
                  <StarIcon className="h-6 w-6 text-gray-800" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">AI智能助手</h3>
                <p className="mt-2 text-sm text-gray-600">生成定制化任务计划，智能支持任务管理，大幅减少手动工作负担，让规划更轻松。</p>
                <ul className="mt-4 space-y-1 text-sm text-gray-600">
                  <li>✓ 智能任务规划</li>
                  <li>✓ 自动优先级排序</li>
                </ul>
              </div>
              <div className="rounded-xl bg-gray-50 p-8 text-left shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E9E2D9]">
                  <CalendarIcon className="h-6 w-6 text-gray-800" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">三层日志系统</h3>
                <p className="mt-2 text-sm text-gray-600">Daily Log记录今日待办，Monthly Log管理月度任务，Future Log规划长期目标。</p>
                <ul className="mt-4 space-y-1 text-sm text-gray-600">
                  <li>✓ 日常任务记录</li>
                  <li>✓ 月度任务迁移</li>
                </ul>
              </div>
              <div className="rounded-xl bg-gray-50 p-8 text-left shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E9E2D9]">
                  <BookIcon className="h-6 w-6 text-gray-800" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">自定义笔记</h3>
                <p className="mt-2 text-sm text-gray-600">随时记录反思、见解和生活时刻，将零散思绪整理成有价值的个人知识库。</p>
                <ul className="mt-4 space-y-1 text-sm text-gray-600">
                  <li>✓ 灵感即时捕捉</li>
                  <li>✓ 智能内容整理</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ****** Preview ****** */}
        <section id="preview" className="min-h-screen flex items-center py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-4xl font-bold">简洁强大的子弹笔记界面</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">传承经典子弹笔记精髓，融入现代AI智能</p>
            <div className="mt-12 rounded-2xl border border-gray-200 bg-white py-24 shadow-lg">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E9E2D9]">
                <BookIcon className="h-10 w-10 text-gray-700"/>
              </div>
              <h3 className="mt-6 text-2xl font-semibold">BulletAI界面预览</h3>
              <p className="mt-2 text-gray-500">这里将展示我们精美的子弹笔记数字化界面</p>
            </div>
          </div>
        </section>

        {/* ****** Testimonials ****** */}
        <section id="testimonials" className="min-h-screen bg-white flex items-center py-20">
          <div className="container mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-4xl font-bold">用户真实反馈</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">来自全球用户的真实评价</p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-[#FDFBF9] p-8 text-left">
                <div className="text-yellow-400">★★★★★</div>
                <p className="mt-4 italic text-gray-700">
                  &quot;BulletAI完美结合了我对子弹笔记的热爱和对AI效率的需求。任务规划从未如此轻松智能。&quot;
                </p>
                <div className="mt-6 flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9E2D9] font-bold">陈</div>
                  <div className="ml-4">
                    <p className="font-semibold">陈小姐</p>
                    <p className="text-sm text-gray-500">产品经理</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-[#FDFBF9] p-8 text-left">
                <div className="text-yellow-400">★★★★★</div>
                <p className="mt-4 italic text-gray-700">
                  &quot;AI助手的任务建议太棒了！它能理解我的工作模式，自动生成最适合的计划安排。&quot;
                </p>
                <div className="mt-6 flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9E2D9] font-bold">李</div>
                  <div className="ml-4">
                    <p className="font-semibold">李先生</p>
                    <p className="text-sm text-gray-500">自由职业者</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-[#FDFBF9] p-8 text-left">
                <div className="text-yellow-400">★★★★★</div>
                <p className="mt-4 italic text-gray-700">
                  &quot;终于找到了数字化的子弹笔记解决方案！三层日志系统让我的规划井井有条。&quot;
                </p>
                <div className="mt-6 flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9E2D9] font-bold">王</div>
                  <div className="ml-4">
                    <p className="font-semibold">王小姐</p>
                    <p className="text-sm text-gray-500">创业者</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ****** Final CTA ****** */}
        <section id="final-cta" className="min-h-screen bg-[#E9E2D9] flex items-center py-20 text-center">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="text-4xl font-bold">准备好体验AI驱动的子弹笔记了吗？</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-700">
              加入我们，开启智能规划与高效记录的新纪元
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/login"
                className="rounded-lg bg-white px-6 py-3 font-semibold shadow-md transition hover:bg-gray-50"
              >
                立即免费试用 &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ****** Footer ****** */}
      <footer className="bg-[#1E2023] text-gray-400">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-between border-b border-gray-700 pb-6 md:flex-row">
            <a href="#" className="flex items-center gap-2 text-xl font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-500">
                <BookIcon className="h-4 w-4 text-gray-200"/>
              </div>
              <span>BulletAI</span>
            </a>
            <div className="mt-4 flex gap-6 md:mt-0">
              <a href="#" className="text-sm hover:text-white">隐私政策</a>
              <a href="#" className="text-sm hover:text-white">服务条款</a>
              <a href="#" className="text-sm hover:text-white">联系我们</a>
            </div>
          </div>
          <div className="pt-6 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} BulletAI. 保留所有权利。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}