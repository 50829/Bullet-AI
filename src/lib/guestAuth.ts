// lib/guestAuth.ts
// 游客模式认证工具函数

const GUEST_MODE_KEY = 'bullet_ai_guest_mode';

/**
 * 设置游客模式
 */
export const setGuestMode = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_MODE_KEY, 'true');
  }
};

/**
 * 清除游客模式
 */
export const clearGuestMode = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GUEST_MODE_KEY);
  }
};

/**
 * 检查是否是游客模式
 */
export const isGuestMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(GUEST_MODE_KEY) === 'true';
};

