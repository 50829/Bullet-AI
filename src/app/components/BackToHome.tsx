"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BackToHome() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <Link
      href="/"
  className="fixed top-4 left-4 z-50 px-4 py-2 rounded-xl bg-[var(--brand-color)] text-white font-medium shadow hover:bg-[var(--brand-color-hover)] transition-colors"
    >
      返回主页面
    </Link>
  );
}
