'use client';

import {useRouter, usePathname} from 'next/navigation';
import Cookies from 'js-cookie';

export default function LangSwitch() {
  const router = useRouter();
  const pathname = usePathname();

  const switchLang = (lang: 'zh' | 'en') => {
    Cookies.set('NEXT_LOCALE', lang, {sameSite: 'strict'});
    // 把当前路径语言段替换掉
    const newPath = pathname.replace(/^\/(zh|en)/, `/${lang}`);
    router.push(newPath);
    router.refresh(); // 让服务端重新以新语言渲染
  };

  const current = pathname.startsWith('/en') ? 'en' : 'zh';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => switchLang('en')}
        className={`px-2 py-1 rounded ${current === 'en' ? 'text-amber-500' : 'text-gray-500'}`}
      >
        EN
      </button>
      <button
        onClick={() => switchLang('zh')}
        className={`px-2 py-1 rounded ${current === 'zh' ? 'text-amber-500' : 'text-gray-500'}`}
      >
        中文
      </button>
    </div>
  );
}