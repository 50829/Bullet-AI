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

  const apiKey = process.env.DOUBAO_API_KEY;
  const model = process.env.DOUBAO_MODEL;
  const primary = process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volcengine.com/api/v3/chat/completions";
  const fallbacks = [primary, "https://ark.cn-beijing.volces.com/api/v3/chat/completions"].filter(
    (v, i, arr) => !!v && arr.indexOf(v) === i
  );

  if (!apiKey || !model) {
    return NextResponse.json(
      { error: "Missing Doubao config: set DOUBAO_API_KEY and DOUBAO_MODEL" },
      { status: 400 }
    );
  }

  const system: ChatMessage = {
    role: "system",
    content:
      "你是一个中文 AI 助手，语气简洁友好。用户在对话中可能提出一个较大的目标，请先给出简短回答；若你能将目标拆解为可执行的小任务，请在回答之后，额外用 JSON 输出一个计划，JSON 用如下结构：{\n  \"tasksDaily\": [{\"title\": \"...\", \"description\": \"...\"}],\n  \"tasksFuture\": [{\"title\": \"...\", \"description\": \"...\"}]\n}\n要求：标题简短（<=30 字符），描述精炼且可执行；若某类为空可省略该字段。除了 JSON 以外的自由文字请放在 JSON 之外。",
  };

  const messages: ChatMessage[] = [system, ...userMessages];

  let resp: Response | null = null;
  let usedBase = "";
  let lastErr = null;
  for (const baseUrl of fallbacks) {
    try {
      usedBase = baseUrl;
      resp = await fetch(baseUrl, {
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
      break;
    } catch (err) {
      lastErr = err;
      resp = null;
      continue;
    }
  }
  if (!resp) {
    return NextResponse.json(
      { error: `Fetch to Doubao failed: ${lastErr?.message || String(lastErr)}`, baseTried: fallbacks },
      { status: 502 }
    );
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return NextResponse.json({ error: `Doubao error: ${resp.status} ${text}`, baseUrl: usedBase }, { status: 500 });
  }

  const data = await resp.json();
  // 兼容 ark chat completions / openai 兼容结构
  let reply: string = "";
  const choice = data?.choices?.[0];
  const msg = choice?.message ?? data?.message;
  const content = msg?.content;
  if (typeof content === "string") {
    reply = content;
  } else if (Array.isArray(content)) {
    // 某些实现中 content 可能是分段数组
    reply = content
      .map((seg) => (typeof seg === "string" ? seg : seg?.text ?? seg?.content ?? ""))
      .join("");
  } else if (typeof data?.output_text === "string") {
    reply = data.output_text;
  }
  const plan = extractJson(reply);

  return NextResponse.json({ reply, plan });
}
