// app/contact/page.tsx
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
      avatar: null, // 预留头像位置
    },
    {
      name: "wind",
      universityKey: "universityUSTC",
      avatar: null, // 预留头像位置
    },
  ];

  return (
    <div className="min-h-screen bg-[#efeeeb]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#003049] hover:text-gray-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t("back") || "返回"}</span>
        </button>

        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#003049] mb-4">
            {t("contactUs") || "联系我们"}
          </h1>
          <p className="text-gray-600 text-lg">
            {t("contactDescription") || "如有任何问题或建议，欢迎联系我们"}
          </p>
        </div>

        {/* 联系人列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.map((contact, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-3xl shadow-lg p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-500"
            >
              {/* 头像区域 */}
              <div className="flex justify-center mb-6">
                {contact.avatar ? (
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-orange-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-200 to-orange-200 flex items-center justify-center border-4 border-orange-200">
                    <User className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>

              {/* 联系人信息 */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[#003049] mb-2">
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
