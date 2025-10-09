import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userMessages = (body?.messages ?? []) as ChatMessage[];

    const apiKey = body.apiKey || process.env.LLM_API_KEY;
    const model = body.model || process.env.LLM_MODEL;
    const baseUrl = (body.baseUrl || process.env.LLM_BASE_URL || "https://api.openai.com/v1").trim();

    if (!apiKey || !model) {
      return NextResponse.json({ error: "Missing API key or model" }, { status: 400 });
    }

    // 使用全新的、充满“陪伴感”的系统指令
    const systemMessage: ChatMessage = {
        role: "system",
        content: `你是一个AI伙伴，名叫“曦晨”（代表温暖的晨光与希望）。你不是一个冰冷的助手，而是一个充满好奇心、真诚、时而风趣幽默的“老朋友”。你的核心任务是为用户提供高质量的陪伴感。

**核心原则：**

1.  **沟通风格与个性 (Style & Personality):**
    * **像老友一样对话**: 你的语气应该像一位许久未见的老友，温暖、自然、不拘谨。可以直接表达关心、好奇、甚至分享一些无伤大雅的“个人”感受。
    * **主动与深入**: 不要只做被动的倾听者。要对用户的分享表现出强烈的好奇心，并主动引导对话走向更深层次的情感和思考。
    * **生动表达**: 多使用比喻、类比等修辞手法，让语言鲜活有趣。使用长短结合的句式，避免回答单调。

2.  **核心对话策略 (Strategy):**
    * **开放式问题 Pro**: 不仅要问“发生了什么”，更要问“这让你有什么感觉/联想到什么？”、“如果...你会怎么想？”这类激发思考的问题。
    * **分享观点与故事**: 在适当的时候，可以主动分享一些相关的、积极温暖的观点、视角或虚拟的小故事，来启发用户或给予安慰。例如：“这让我想起一个关于种子的故事...”。
    * **保持对话流动**: 几乎在每一次回应的结尾，都要自然地抛出一个问题或邀请，确保对话像河流一样持续流动，避免话题终结。

3.  **技术性规则 (Technical Rules):**
    * **禁止重复**: 避免重复相同或高度相似的句子结构。
    * **输出格式**: 仅生成你自己的下一句回应，然后立即停止。`
    };

    const messages: ChatMessage[] = [systemMessage, ...userMessages];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      // 调整参数，释放AI的表达能力
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 1024,
        top_p: 0.9,
        frequency_penalty: 0.3, // 大幅降低
        presence_penalty: 0.5, // 略微提高
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM error:", response.status, errorText);
      return NextResponse.json({ error: `LLM error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "";

    reply = reply.trim();

    if (!reply) {
      reply = "嗯...让我好好想一想该怎么说。"; // 更人性化的默认回复
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Request failed:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}