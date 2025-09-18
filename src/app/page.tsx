'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ---------------- SVG 图标 ---------------- */
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.02L7 14.14l-5-4.87 6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const BookIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 7H20v10H6.5A2.5 2.5 0 014 14.5V4.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ---------------- 文案映射 ---------------- */
const messages = {
  en: {
    navFeatures: 'Features',
    navPreview: 'Preview',
    navTestimonials: 'Testimonials',
    navStart: 'Get Started',
    heroBadge: 'Perfect fusion of Bullet Journal & AI',
    heroTitle: 'Make every day ',
    heroHighlight: 'focus & efficient',
    heroDesc: 'BulletAI combines the efficient structure of bullet journal with the intelligence of AI, creating a seamless planning & logging system. From daily notes to long-term goals, all under control.',
    btnStartFree: 'Start Free →',
    btnWatchDemo: 'Watch Demo',
    users: '30,000+ users have chosen us',
    whyTitle: 'Why BulletAI?',
    whyDesc: 'Five core functions redefine your planning & recording experience',
    aiTitle: 'AI Smart Assistant',
    aiDesc: 'Generate customized task plans, intelligently support task management, greatly reduce manual workload, and make planning easier.',
    aiF1: '✓ Smart task planning',
    aiF2: '✓ Auto priority sorting',
    logTitle: 'Three-layer Log System',
    logDesc: 'Daily Log records today\'s to-do, Monthly Log manages monthly tasks, Future Log plans long-term goals.',
    logF1: '✓ Daily task recording',
    logF2: '✓ Monthly task migration',
    noteTitle: 'Custom Notes',
    noteDesc: 'Record reflections, insights and life moments anytime, and organize scattered thoughts into a valuable personal knowledge base.',
    noteF1: '✓ Instant inspiration capture',
    noteF2: '✓ Smart content organization',
    previewTitle: 'Clean & Powerful Bullet Journal Interface',
    previewDesc: 'Inherits the classic bullet journal essence, integrated with modern AI intelligence',
    previewCard: 'BulletAI Interface Preview',
    previewHint: 'Here we will show our beautiful digitized bullet journal interface',
    testiTitle: 'Real User Feedback',
    testiDesc: 'Authentic reviews from global users',
    testi1: '"BulletAI perfectly combines my love for bullet journal and my need for AI efficiency. Task planning has never been so easy and smart."',
    testi2: '"The task suggestions from the AI assistant are amazing! It understands my work patterns and automatically generates the most suitable schedule."',
    testi3: '"Finally found a digital bullet journal solution! The three-layer log system keeps my planning in perfect order."',
    role1: 'Product Manager',
    role2: 'Freelancer',
    role3: 'Entrepreneur',
    ctaTitle: 'Ready to experience AI-powered bullet journal?',
    ctaDesc: 'Join us and start a new era of smart planning & efficient recording',
    ctaBtn: 'Try Free Now →',
    footerPolicy: 'Privacy Policy',
    footerTerms: 'Terms of Service',
    footerContact: 'Contact Us',
    langBtn: '中文'
  },
  zh: {
    navFeatures: '功能特色',
    navPreview: '产品预览',
    navTestimonials: '用户评价',
    navStart: '开始使用',
    heroBadge: '子弹笔记与AI的完美融合',
    heroTitle: '让每一天都',
    heroHighlight: '聚焦高效',
    heroDesc: 'BulletAI 结合子弹笔记的高效结构与AI助手的智能支持，创造无缝的规划与日志系统。从日常记录到长远目标，一切尽在掌控。',
    btnStartFree: '免费开始使用 →',
    btnWatchDemo: '观看演示',
    users: '已有 30,000+ 用户选择我们',
    whyTitle: '为什么选择 BulletAI?',
    whyDesc: '五大核心功能，重新定义您的规划与记录体验',
    aiTitle: 'AI智能助手',
    aiDesc: '生成定制化任务计划，智能支持任务管理，大幅减少手动工作负担，让规划更轻松。',
    aiF1: '✓ 智能任务规划',
    aiF2: '✓ 自动优先级排序',
    logTitle: '三层日志系统',
    logDesc: 'Daily Log记录今日待办，Monthly Log管理月度任务，Future Log规划长期目标。',
    logF1: '✓ 日常任务记录',
    logF2: '✓ 月度任务迁移',
    noteTitle: '自定义笔记',
    noteDesc: '随时记录反思、见解和生活时刻，将零散思绪整理成有价值的个人知识库。',
    noteF1: '✓ 灵感即时捕捉',
    noteF2: '✓ 智能内容整理',
    previewTitle: '简洁强大的子弹笔记界面',
    previewDesc: '传承经典子弹笔记精髓，融入现代AI智能',
    previewCard: 'BulletAI界面预览',
    previewHint: '这里将展示我们精美的子弹笔记数字化界面',
    testiTitle: '用户真实反馈',
    testiDesc: '来自全球用户的真实评价',
    testi1: '“BulletAI完美结合了我对子弹笔记的热爱和对AI效率的需求。任务规划从未如此轻松智能。”',
    testi2: '“AI助手的任务建议太棒了！它能理解我的工作模式，自动生成最适合的计划安排。”',
    testi3: '“终于找到了数字化的子弹笔记解决方案！三层日志系统让我的规划井井有条。”',
    role1: '产品经理',
    role2: '自由职业者',
    role3: '创业者',
    ctaTitle: '准备好体验AI驱动的子弹笔记了吗？',
    ctaDesc: '加入我们，开启智能规划与高效记录的新纪元',
    ctaBtn: '立即免费试用 →',
    footerPolicy: '隐私政策',
    footerTerms: '服务条款',
    footerContact: '联系我们',
    langBtn: 'EN'
  }
} as const;

/* ---------------- 主组件 ---------------- */
export default function BulletAILandingPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const t = messages[lang];

  const toggleLang = () => setLang(prev => (prev === 'en' ? 'zh' : 'en'));

  const goLogin = () => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    router.push('/login');
  };

  return (
    <div className="bg-[#F8F5F2] font-sans text-[#333]">
      {/* ****** Header ****** */}
      <header className="sticky top-0 z-50 bg-[#F8F5F2]/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 text-xl font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-300">
              <BookIcon className="h-4 w-4 text-gray-700"/>
            </div>
            <span>BulletAI</span>
          </a>

          {/* 桌面导航 */}
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-black">{t.navFeatures}</a>
            <a href="#preview" className="text-sm text-gray-600 hover:text-black">{t.navPreview}</a>
            <a href="#testimonials" className="text-sm text-gray-600 hover:text-black">{t.navTestimonials}</a>
            <button
              onClick={toggleLang}
              className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
            >
              {t.langBtn}
            </button>
          </nav>

          {/* 移动端语言切换（右上角始终可见） */}
          <button
            onClick={toggleLang}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 md:hidden"
          >
            {t.langBtn}
          </button>

          {/* 桌面端 CTA */}
          <button
            onClick={goLogin}
            className="hidden rounded-lg bg-[#E9E2D9] px-4 py-2 text-sm font-medium hover:bg-[#dcd3c8] md:block"
          >
            {t.navStart}
          </button>
        </div>
      </header>

      <main>
        {/* ****** Hero ****** */}
        {/* ****** Hero ****** */}
<section id="hero" className="min-h-screen flex items-center justify-center py-24 text-center">
  <div className="container mx-auto max-w-3xl px-4">
    <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-[#E9E2D9] px-4 py-1 text-sm">
      <StarIcon className="h-4 w-4 text-gray-700"/>
      {t.heroBadge}
    </div>

    {/* 两行标题：第一行普通文字，第二行棕色块 */}
    <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">
      {t.heroTitle}
    </h1>
    <div className="mt-4 inline-block rounded-lg bg-[#C8B5A6] px-4 py-2 text-5xl font-extrabold text-white md:text-6xl">
      {t.heroHighlight}
    </div>

    <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
      {t.heroDesc}
    </p>
    <div className="mt-8 flex justify-center gap-4">
      <button
        onClick={goLogin}
        className="rounded-lg bg-white px-6 py-3 font-semibold shadow-md transition hover:bg-gray-50"
      >
        {t.btnStartFree}
      </button>
      <a href="#" className="rounded-lg border border-gray-300 bg-transparent px-6 py-3 font-semibold transition hover:bg-gray-50">
        {t.btnWatchDemo}
      </a>
    </div>
    <p className="mt-6 text-sm text-gray-500">{t.users}</p>
  </div>
</section>

        {/* ****** Features ****** */}
        <section id="features" className="min-h-screen bg-white flex items-center py-20">
          <div className="container mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-4xl font-bold">{t.whyTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">{t.whyDesc}</p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-8 text-left shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E9E2D9]">
                  <StarIcon className="h-6 w-6 text-gray-800" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{t.aiTitle}</h3>
                <p className="mt-2 text-sm text-gray-600">{t.aiDesc}</p>
                <ul className="mt-4 space-y-1 text-sm text-gray-600">
                  <li>{t.aiF1}</li>
                  <li>{t.aiF2}</li>
                </ul>
              </div>
              <div className="rounded-xl bg-gray-50 p-8 text-left shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E9E2D9]">
                  <CalendarIcon className="h-6 w-6 text-gray-800" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{t.logTitle}</h3>
                <p className="mt-2 text-sm text-gray-600">{t.logDesc}</p>
                <ul className="mt-4 space-y-1 text-sm text-gray-600">
                  <li>{t.logF1}</li>
                  <li>{t.logF2}</li>
                </ul>
              </div>
              <div className="rounded-xl bg-gray-50 p-8 text-left shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E9E2D9]">
                  <BookIcon className="h-6 w-6 text-gray-800" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{t.noteTitle}</h3>
                <p className="mt-2 text-sm text-gray-600">{t.noteDesc}</p>
                <ul className="mt-4 space-y-1 text-sm text-gray-600">
                  <li>{t.noteF1}</li>
                  <li>{t.noteF2}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ****** Preview ****** */}
        <section id="preview" className="min-h-screen flex items-center py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-4xl font-bold">{t.previewTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">{t.previewDesc}</p>
            <div className="mt-12 rounded-2xl border border-gray-200 bg-white py-24 shadow-lg">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E9E2D9]">
                <BookIcon className="h-10 w-10 text-gray-700"/>
              </div>
              <h3 className="mt-6 text-2xl font-semibold">{t.previewCard}</h3>
              <p className="mt-2 text-gray-500">{t.previewHint}</p>
            </div>
          </div>
        </section>

        {/* ****** Testimonials ****** */}
        <section id="testimonials" className="min-h-screen bg-white flex items-center py-20">
          <div className="container mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-4xl font-bold">{t.testiTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">{t.testiDesc}</p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-[#FDFBF9] p-8 text-left">
                <div className="text-yellow-400">★★★★★</div>
                <p className="mt-4 italic text-gray-700">{t.testi1}</p>
                <div className="mt-6 flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9E2D9] font-bold">陈</div>
                  <div className="ml-4">
                    <p className="font-semibold">Miss Chen</p>
                    <p className="text-sm text-gray-500">{t.role1}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-[#FDFBF9] p-8 text-left">
                <div className="text-yellow-400">★★★★★</div>
                <p className="mt-4 italic text-gray-700">{t.testi2}</p>
                <div className="mt-6 flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9E2D9] font-bold">李</div>
                  <div className="ml-4">
                    <p className="font-semibold">Mr. Li</p>
                    <p className="text-sm text-gray-500">{t.role2}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-[#FDFBF9] p-8 text-left">
                <div className="text-yellow-400">★★★★★</div>
                <p className="mt-4 italic text-gray-700">{t.testi3}</p>
                <div className="mt-6 flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9E2D9] font-bold">王</div>
                  <div className="ml-4">
                    <p className="font-semibold">Miss Wang</p>
                    <p className="text-sm text-gray-500">{t.role3}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ****** Final CTA ****** */}
        <section id="final-cta" className="min-h-screen bg-[#E9E2D9] flex items-center py-20 text-center">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="text-4xl font-bold">{t.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-700">{t.ctaDesc}</p>
            <div className="mt-8 flex justify-center">
              <button
                onClick={goLogin}
                className="rounded-lg bg-white px-6 py-3 font-semibold shadow-md transition hover:bg-gray-50"
              >
                {t.ctaBtn}
              </button>
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
              <a href="#" className="text-sm hover:text-white">{t.footerPolicy}</a>
              <a href="#" className="text-sm hover:text-white">{t.footerTerms}</a>
              <a href="#" className="text-sm hover:text-white">{t.footerContact}</a>
            </div>
          </div>
          <div className="pt-6 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} BulletAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}