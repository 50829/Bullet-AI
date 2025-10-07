// lib/supabaseClient.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// ✅ 创建与 Next.js App Router 兼容的客户端
export const supabase = createClientComponentClient();
