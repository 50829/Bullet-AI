import { supabase } from './supabaseClient';

/**
 * 获取当前用户的昵称
 * @returns 昵称，如果不存在则返回 null
 */
export async function getUserUsername(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", session.user.id)
      .single();

    return profile?.username || null;
  } catch (error) {
    console.error("获取昵称失败:", error);
    return null;
  }
}

/**
 * 检查用户是否有昵称
 * @returns 如果有昵称返回 true，否则返回 false
 */
export async function hasUsername(): Promise<boolean> {
  const username = await getUserUsername();
  return username !== null;
}
