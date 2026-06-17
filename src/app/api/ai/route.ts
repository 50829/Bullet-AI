import { NextResponse } from "next/server";
import {
  extractPlanFromReply,
  removePlanFromReply,
  toFrontendPlan,
} from "../../../lib/ai/planParser";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages: userMessages, language, systemPrompt } = body as {
      messages: ChatMessage[];
      language?: string;
      systemPrompt?: string;
    };

    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL || "doubao-seed-1-6-flash-250715";
    let baseUrl = process.env.LLM_BASE_URL;

    if (!apiKey) {
      console.error("[AI Route] 未设置 LLM_API_KEY 环境变量");
      return NextResponse.json({ error: "服务器配置错误：未设置 API Key" }, { status: 500 });
    }
    if (!baseUrl) {
      console.error("[AI Route] 未设置 LLM_BASE_URL 环境变量");
      return NextResponse.json({ error: "服务器配置错误：未设置 API Base URL" }, { status: 500 });
    }

    let endpoint: string;
    if (baseUrl.includes('/chat/completions')) {
      endpoint = baseUrl;
    } else {
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      endpoint = `${baseUrl}/chat/completions`;
    }

    const languageInstruction = language === 'en' 
      ? "Please respond in English." 
      : "请使用中文回复。";

    const defaultSystemPrompt = 
      "你是用户的倾听伙伴，一个温暖、理解、倾听的陪伴者。请严格遵守以下规则：\n" +
      `1. 回答必须温暖、真诚、口语化，且使用与用户相同的语言。${languageInstruction}\n` +
      "2. 基于用户分享的时刻、感悟和目标，给予理解和支持。\n" +
      "3. 如果用户需要规划或安排，可以在回复后提供结构化的任务计划（使用 ```json 格式）。\n" +
      "4. 保持对话的自然流畅，不要过于机械。\n" +
      "5. 当用户表达情感时，给予共情和理解。";

    const system: ChatMessage = {
      role: "system",
      content: systemPrompt || defaultSystemPrompt,
    };

    const messages: ChatMessage[] = [system, ...userMessages];

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("豆包 API 调用失败:", errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error("豆包 API 详细错误信息:", errorJson);
        if (errorJson.base_resp && errorJson.base_resp.status_code === 1004) {
          return NextResponse.json({ error: `API 认证失败: ${errorJson.base_resp.status_msg}` }, { status: resp.status });
        }
      } catch (e) {
        console.error("解析错误信息失败:", e);
      }
      
      return NextResponse.json({ error: `调用失败: ${errorText}` }, { status: resp.status });
    }

    const data = await resp.json();

    let reply: string = data.choices?.[0]?.message?.content || "";
    const internalPlan = extractPlanFromReply(reply);
    reply = removePlanFromReply(reply);
    const frontendPlan = internalPlan ? toFrontendPlan(internalPlan) : undefined;

    return NextResponse.json({
      reply,
      plan: frontendPlan,
    });
  } catch (err) {
    console.error("[AI Route] 发生错误：", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
