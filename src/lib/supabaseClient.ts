// lib/supabaseClient.ts (migrated from @supabase/auth-helpers-nextjs to @supabase/ssr)
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
	cookieOptions: {
		// 维持与原 helpers 类似的 session 行为
		// 这里保持默认；如需 SSR/Edge 处理可在 server actions / route handlers 中使用 createServerClient
	}
});
