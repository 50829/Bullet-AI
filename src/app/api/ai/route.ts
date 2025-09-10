import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type PlanTask = { title: string; description?: string };
type Plan = { tasksDaily?: PlanTask[]; tasksFuture?: PlanTask[] };

function extractJson(text: string): Plan | null {
  // 寻找第一个 JSON 对象，容错解析
  const fenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  try {
    const obj = JSON.parse(candidate);
    if (obj && (obj.tasksDaily || obj.tasksFuture)) return obj as Plan;
  } catch {}
  // 再尝试提取最外层 {...}
  const braceMatch = text.match(/[\{\[][\s\S]*[\}\]]/);
  if (braceMatch) {
    try {
      const obj = JSON.parse(braceMatch[0]);
      if (obj && (obj.tasksDaily || obj.tasksFuture)) return obj as Plan;
    } catch {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userMessages = (body?.messages ?? []) as ChatMessage[];

  // 修改1: 允许从 body 或 env 中获取配置，使其支持任意 OpenAI-compatible API
  // 优先使用 body 中的值（用于动态测试），fallback 到 env（用于生产）
  const apiKey = body.apiKey || process.env.LLM_API_KEY;  // 要修改: 设置环境变量 LLM_API_KEY 为你的 API key
  const model = body.model || process.env.LLM_MODEL;      // 要修改: 设置环境变量 LLM_MODEL 为你的模型名称
  // baseUrl 支持多个 fallback，包括你的新 API 的 URL
  const primaryBase = body.baseUrl || process.env.LLM_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";  // 要修改: 设置 LLM_BASE_URL 为你的 API base URL，或修改默认值
  const fallbacks = [primaryBase, "https://ark.cn-beijing.volces.com/api/v3"].filter(  // 要修改: 替换或添加你的 API fallback URL
    (v, i, arr) => !!v && arr.indexOf(v) === i
  );

  if (!apiKey || !model) {
    return NextResponse.json(
      { error: "Missing LLM config: provide apiKey and model in body or set LLM_API_KEY and LLM_MODEL in env" },
      { status: 400 }
    );
  }

  const system: ChatMessage = {
    role: "system",
    content:
      "你是一个中文 AI 任务管家，用户是你的老板，请保持语气简洁友好。用户在对话中可能提出一个较大的目标，请先给出简短回答；若你能将目标拆解为可执行的小任务，请在回答之后，额外用 JSON 输出一个计划，JSON 用如下结构：{\n  \"tasksDaily\": [{\"title\": \"...\", \"description\": \"...\"}],\n  \"tasksFuture\": [{\"title\": \"...\", \"description\": \"...\"}]\n}\n要求：标题简短（<=30 字符），描述精炼且可执行；若某类为空可省略该字段。除了 JSON 以外的自由文字请放在 JSON 之外。",
  };

  const messages: ChatMessage[] = [system, ...userMessages];

  let resp: Response | null = null;
  let usedBase = "";
  let lastErr = null;
  for (const baseUrl of fallbacks) {
    try {
      usedBase = baseUrl;
      // 修改2: 确保 endpoint 是 /chat/completions（大多数兼容 API 使用这个）
      const endpoint = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}/chat/completions`;
      resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          temperature: 0.3,
        }),
      });
      if (resp.ok) break;  // 如果成功，跳出循环
    } catch (err) {
      lastErr = err;
      resp = null;
      continue;
    }
  }
  if (!resp) {
    return NextResponse.json(
      { error: `Fetch to LLM failed: ${lastErr?.message || String(lastErr)}`, baseTried: fallbacks },
      { status: 502 }
    );
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return NextResponse.json({ error: `LLM error: ${resp.status} ${text}`, baseUrl: usedBase }, { status: 500 });
  }

  const data = await resp.json();
  // 修改3: 增强兼容性，处理更多可能的响应结构（e.g., OpenAI, Anthropic, 或其他）
  let reply: string = "";
  const choice = data?.choices?.[0];
  const msg = choice?.message ?? data?.message ?? data?.completion;
  const content = msg?.content ?? choice?.text ?? data?.output?.text;
  if (typeof content === "string") {
    reply = content;
  } else if (Array.isArray(content)) {
    reply = content
      .map((seg) => (typeof seg === "string" ? seg : seg?.text ?? seg?.content ?? ""))
      .join("");
  } else if (typeof data?.output_text === "string") {
    reply = data.output_text;
  } else if (data?.content) {
    reply = data.content;  // 额外兼容
  }
  const plan = extractJson(reply);
  reply = reply.replace(/\{[\s\S]*\}$/, "").trim();

  // 修改4: 响应中避免返回 apiKey（安全）
  return NextResponse.json({ reply, plan });
}