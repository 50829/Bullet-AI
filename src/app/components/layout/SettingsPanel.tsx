// src/components/layout/SettingsPanel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../../lib/supabaseClient';

interface SettingsPanelProps {
  onClose: () => void;
  initialProfile?: {
    username: string;
    updated_at: string | null;
  } | null;
  onProfileUpdate?: (profile: { username: string; updated_at: string | null }) => void;
}

type SettingsSection = 'user';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, initialProfile, onProfileUpdate }) => {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SettingsSection>('user');
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    // 如果有初始数据，直接使用；否则获取数据
    if (initialProfile) {
      setCurrentUsername(initialProfile.username || '');
      setUsername(initialProfile.username || '');
      
      // 检查是否可以修改用户名（每三天一次）
      if (initialProfile.updated_at) {
        const lastUpdate = new Date(initialProfile.updated_at);
        const now = new Date();
        const diffTime = now.getTime() - lastUpdate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 3) {
          setCanChangeUsername(false);
          const remaining = 3 - diffDays;
          setDaysRemaining(remaining);
        } else {
          setCanChangeUsername(true);
          setDaysRemaining(0);
        }
      } else {
        setCanChangeUsername(true);
        setDaysRemaining(0);
      }
    } else {
      // 如果没有初始数据，尝试获取
      fetchUserProfile();
    }
  }, [initialProfile]);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onClose();
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, updated_at")
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("获取用户信息失败:", error);
        return;
      }

      if (profile) {
        setCurrentUsername(profile.username || '');
        setUsername(profile.username || '');
        
        // 检查是否可以修改用户名（每三天一次）
        if (profile.updated_at) {
          const lastUpdate = new Date(profile.updated_at);
          const now = new Date();
          const diffTime = now.getTime() - lastUpdate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 3) {
            setCanChangeUsername(false);
            const remaining = 3 - diffDays;
            setDaysRemaining(remaining);
          } else {
            setCanChangeUsername(true);
            setDaysRemaining(0);
          }
        } else {
          setCanChangeUsername(true);
          setDaysRemaining(0);
        }
      }
    } catch (error) {
      console.error("获取用户信息时出错:", error);
    }
  };

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setMessage(t("usernameRequired") || "请输入用户名");
      return;
    }

    if (username.trim() === currentUsername) {
      setMessage(t("usernameUnchanged") || "用户名未更改");
      return;
    }

    if (!canChangeUsername) {
      const cooldownMsg = (t("usernameChangeCooldown") || "您需要等待 {days} 天才能再次修改用户名").replace("{days}", daysRemaining.toString());
      setMessage(cooldownMsg);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onClose();
        return;
      }

      // 检查昵称是否已被使用
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username.trim())
        .single();

      if (existing && existing.user_id !== session.user.id) {
        setMessage(t("usernameTaken") || "该用户名已被使用，请选择其他用户名");
        setLoading(false);
        return;
      }

      // 更新用户名
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id);

      if (error) {
        console.error("更新用户名失败:", error);
        setMessage(t("updateFailed") || "更新失败，请稍后再试");
        setLoading(false);
        return;
      }

      setCurrentUsername(username.trim());
      setMessage(t("updateSuccess") || "用户名更新成功！");
      setCanChangeUsername(false);
      setDaysRemaining(3);
      
      // 通知父组件更新数据
      if (onProfileUpdate) {
        onProfileUpdate({
          username: username.trim(),
          updated_at: new Date().toISOString(),
        });
      }
      
      // 刷新页面以更新显示的用户名
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("更新用户名时出错:", err);
      setMessage(t("updateError") || "发生错误，请稍后再试");
      setLoading(false);
    }
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        onClick={onClose}
      />
      
      {/* 设置面板 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#efeeeb] rounded-[32px] shadow-xl max-w-4xl w-full h-[80vh] transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
            <h2 className="text-2xl font-bold text-[#003049]">
              {t("settings") || "设置"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200/50 transition-colors"
              aria-label={t("close") || "关闭"}
            >
              <X size={24} className="text-[#6c757d]" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* 左侧栏 */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200/50 p-4">
              <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2">
                <button
                  onClick={() => setActiveSection('user')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    activeSection === 'user'
                      ? 'bg-[#003049] text-white'
                      : 'text-[#6c757d] hover:bg-gray-200/50'
                  }`}
                >
                  <User size={20} />
                  <span className="font-medium">{t("user") || "用户"}</span>
                </button>
              </nav>
            </div>

            {/* 右侧内容 */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {activeSection === 'user' && (
                <div className="max-w-2xl">
                  <h3 className="text-xl font-semibold text-[#003049] mb-6">
                    {t("userSettings") || "用户设置"}
                  </h3>

                  <form onSubmit={handleUsernameChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("username") || "用户名"}
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full border border-[#003049] rounded-3xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#003049] text-[#003049]"
                        placeholder={t("usernamePlaceholder") || "请输入用户名"}
                        disabled={loading || !canChangeUsername}
                        maxLength={20}
                      />
                      {!canChangeUsername && (
                        <p className="mt-2 text-sm text-[#B8860B]">
                          {(t("usernameChangeCooldown") || "您需要等待 {days} 天才能再次修改用户名").replace("{days}", daysRemaining.toString())}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !canChangeUsername || username.trim() === currentUsername}
                      className="px-6 py-2.5 rounded-3xl bg-[#003049] text-white font-bold border-2 border-transparent hover:bg-white hover:text-[#003049] hover:border-[#003049] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (t("saving") || "保存中...") : (t("save") || "保存")}
                    </button>
                  </form>

                  {message && (
                    <p className={`mt-4 text-sm ${
                      message.includes(t("updateSuccess") || "成功") 
                        ? "text-green-500" 
                        : "text-[#B8860B]"
                    }`}>
                      {message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
