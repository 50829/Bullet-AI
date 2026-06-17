"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, User } from "lucide-react";

export default function ContactPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const contacts = [
    {
      name: "operator",
      universityKey: "universityHIT",
    },
    {
      name: "wind",
      universityKey: "universityUSTC",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-8 transition-colors text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t("back") || "返回"}</span>
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--color-text-primary)]">
            {t("contactUs") || "联系我们"}
          </h1>
          <p className="text-gray-600 text-lg">
            {t("contactDescription") || "如有任何问题或建议，欢迎联系我们"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.map((contact, index) => (
            <div
              key={index}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex justify-center mb-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <User className="w-12 h-12 text-gray-600" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2 text-[var(--color-text-primary)]">
                  {contact.name}
                </h3>
                <p className="text-gray-600 text-lg">
                  {t("from")} {t(contact.universityKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
