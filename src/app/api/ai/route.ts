import { NextRequest, NextResponse } from "next/server";
import type { Task } from "../../types";

export const runtime = "nodejs";

type ChatMessage = { role: "system" | "user" | "assistant"; content?: string; text?: string };
type PlanTask = { title: string; description?: string; when?: "today" | "future" | "migration" };
type Plan = { tasksDaily?: PlanTask[]; tasksFuture?: PlanTask[] };

/** 容错提取 JSON 计划 */
function extractJson(text: string): Plan | null {
  const fence = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fence ? fence[1] : text;
  try {
    const obj = JSON.parse(candidate);
    if (obj && (obj.tasksDaily || obj.tasksFuture)) return obj as Plan;
  } catch {}
  const brace = text.match(/[\{\[][\s\S]*[\}\]]/);
  if (brace) {
    try {
      const obj = JSON.parse(brace[0]);
      if (obj && (obj.tasksDaily || obj.tasksFuture)) return obj as Plan;
    } catch {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userMessages = (body?.messages ?? []) as ChatMessage[];
  const tasks       = (body?.tasks ?? []) as Task[];

  /* 1. 读配置（优先 body，其次 env） */
  const apiKey   = body.apiKey || process.env.LLM_API_KEY;
  const model    = body.model || process.env.LLM_MODEL;
  const primaryBase = (body.baseUrl || process.env.LLM_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\s+$/, '');
  const fallbacks = [primaryBase, "https://ark.cn-beijing.volces.com/api/v3"].filter((v, i, arr) => !!v && arr.indexOf(v) === i);

  if (!apiKey || !model) {
    return NextResponse.json({ error: "Missing LLM config" }, { status: 400 });
  }

  /* 2. 超级 System Prompt → 强制拆任务 + JSON */
  const system: ChatMessage = {
    role: "system",
    content:
      "你是中文 AI 任务管家，用户是你的老板。请严格按以下规则工作：\n" +
      "1. 先给出一句简短、口语化的中文回答。\n" +
      "2. 如果用户提到「计划、安排、提醒、目标、任务、复习、准备、清单、时间表」或类似意图，**必须在回答之后**用 ```json 包裹输出可执行任务计划。\n" +
      "3. JSON 结构：\n" +
      '{\n' +
      '  "tasksDaily": [{ "title": "...", "description": "..." }],\n' +
      '  "tasksFuture": [{ "title": "...", "description": "..." }]\n' +
      '}\n' +
      "字段说明：\n" +
      "- title ≤ 30 字符，描述精炼、可执行；\n" +
      "- 若某类为空，可省略该字段；\n" +
      "4. 强制触发示例（必须照做）：\n" +
      "用户：下周考雅思，帮我排 7 天复习计划\n" +
      "你：好咧，已为你安排 7 天冲刺！```json\\n" +
      '{"tasksDaily":[{"title":"雅思听力训练","description":"Cambridge 11 Test 1 + 精听"}],"tasksFuture":[{"title":"阅读真题演练","description":"Passage 1-3 限时训练"}]}' +
      "\\n```\n" +
      "5. 除 JSON 外不要输出其他代码块。",
  };
  /* 3. 保证每条消息都有 content */
  const messages: ChatMessage[] = [
    system,
    ...userMessages.map((m) => ({
      role: m.role,
      content: m.content || m.text || "（无内容）",
    })),
  ];

  /* 4. 请求 LLM（带重试） */
  let resp: Response | null = null;
  let usedBase = "";
  let lastErr = null;
  for (const baseUrl of fallbacks) {
    try {
      usedBase = baseUrl;
      const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
      console.log(`【AI Route】Trying ${endpoint}`);
      console.log("【AI Route】最终发出 messages:", JSON.stringify(messages, null, 2));
      resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, stream: false, temperature: 0.3 }),
      });
      if (resp.ok) break;
    } catch (err) {
      lastErr = err;
      resp = null;
      continue;
    }
  }

  if (!resp) {
    console.error("【AI Route】All fetch failed", lastErr);
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("【AI Route】LLM error", resp.status, text);
    return NextResponse.json({ error: `LLM ${resp.status}` }, { status: 500 });
  }

  /* 5. 解析回复 & 提取计划 */
  const data = await resp.json();
  let reply = "";
  const choice = data?.choices?.[0];
  const msg = choice?.message ?? data?.message ?? data?.completion;
  const content = msg?.content ?? choice?.text ?? data?.output?.text;
  if (typeof content === "string") reply = content;
  else if (Array.isArray(content))
    reply = content
      .map((s: unknown) =>
        typeof s === "string"
          ? s
          : (s as { text?: string; content?: string }).text ??
            (s as { text?: string; content?: string }).content ??
            ""
      )
      .join("");
  else if (typeof data?.output_text === "string") reply = data.output_text;
  else if (data?.content) reply = data.content;

  const plan = extractJson(reply);
  reply = reply.replace(/\{[\s\S]*\}$/, "").trim();

  console.log("【AI Route】reply:", reply, "plan:", plan);
  return NextResponse.json({ reply, plan });
}