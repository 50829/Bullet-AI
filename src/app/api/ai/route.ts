// src/app/api/ai/route.ts - 修改版 3
import { NextResponse } from "next/server";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PlanTask {
  title: string;
  description: string;
}

interface InternalPlan {
  tasksDaily: PlanTask[];
  tasksFuture: PlanTask[];
}

interface FrontendPlan {
  daily: PlanTask[];
  future: PlanTask[];
}

function extractJson(text: string): InternalPlan | null {
  try {
    // 尝试多种JSON格式匹配
    // 1. 标准 ```json ... ``` 格式
    let jsonMatch = text.match(/```json([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.tasksDaily || parsed.tasksFuture) {
        return parsed;
      }
    }
    
    // 2. 只有 ``` 包裹的JSON
    jsonMatch = text.match(/```([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      const content = jsonMatch[1].trim();
      // 如果内容看起来像JSON（以 { 开头）
      if (content.startsWith('{')) {
        const parsed = JSON.parse(content);
        if (parsed.tasksDaily || parsed.tasksFuture) {
          return parsed;
        }
      }
    }
    
    // 3. 直接查找JSON对象（没有代码块包裹）
    jsonMatch = text.match(/\{[\s\S]*"tasksDaily"[\s\S]*"tasksFuture"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tasksDaily || parsed.tasksFuture) {
        return parsed;
      }
    }
    
    // 4. 查找包含 tasksDaily 或 tasksFuture 的JSON对象
    const jsonPattern = /\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\})*)*\})*)*"tasks(?:Daily|Future)"[^}]*\}/;
    jsonMatch = text.match(jsonPattern);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tasksDaily || parsed.tasksFuture) {
          return parsed;
        }
      } catch {
        // 忽略解析错误，继续尝试其他方法
      }
    }
    
    return null;
  } catch (e) {
    console.error("[AI Route] JSON 解析失败：", e);
    console.error("[AI Route] 原始文本：", text);
    return null;
  }
}

function convertPlanForFrontend(plan: InternalPlan): FrontendPlan {
  return {
    daily: plan.tasksDaily || [],
    future: plan.tasksFuture || [],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ✅ 修改：从前端获取 messages 数组、language 和 systemPrompt
    const { messages: userMessages, language, systemPrompt } = body as {
      messages: ChatMessage[];
      language?: string;
      systemPrompt?: string;
    };

    // 从环境变量获取配置
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL || "doubao-seed-1-6-flash-250715"; // 使用环境变量中的模型名
    let baseUrl = process.env.LLM_BASE_URL;

    if (!apiKey) {
      console.error("[AI Route] 未设置 LLM_API_KEY 环境变量");
      return NextResponse.json({ error: "服务器配置错误：未设置 API Key" }, { status: 500 });
    }
    if (!baseUrl) {
      console.error("[AI Route] 未设置 LLM_BASE_URL 环境变量");
      return NextResponse.json({ error: "服务器配置错误：未设置 API Base URL" }, { status: 500 });
    }

    // 检查 baseUrl 是否已经包含完整路径
    // 如果已经包含 /chat/completions，则直接使用；否则拼接
    let endpoint: string;
    if (baseUrl.includes('/chat/completions')) {
      // 已经包含完整路径，直接使用
      endpoint = baseUrl;
    } else {
      // 需要拼接路径
      // 确保 baseUrl 不以 / 结尾
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      endpoint = `${baseUrl}/chat/completions`;
    }

    // 根据语言设置调整系统提示
    const languageInstruction = language === 'en' 
      ? "Please respond in English." 
      : "请使用中文回复。";

    // System Prompt - 如果提供了自定义 systemPrompt，使用它；否则使用默认
    const defaultSystemPrompt = 
      "你是用户的 AI 树洞，一个温暖、理解、倾听的陪伴者。请严格遵守以下规则：\n" +
      `1. 回答必须温暖、真诚、口语化，且使用与用户相同的语言。${languageInstruction}\n` +
      "2. 基于用户分享的时刻、感悟和目标，给予理解和支持。\n" +
      "3. 如果用户需要规划或安排，可以在回复后提供结构化的任务计划（使用 ```json 格式）。\n" +
      "4. 保持对话的自然流畅，不要过于机械。\n" +
      "5. 当用户表达情感时，给予共情和理解。";

    const system: ChatMessage = {
      role: "system",
      content: systemPrompt || defaultSystemPrompt,
    };

    // 将 system message 放在第一位，然后是用户发送的消息
    const messages: ChatMessage[] = [system, ...userMessages];

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 使用环境变量中的 API Key
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages, // 传递 [system_message, user_message]
        temperature: 0.5, // 可选：稍微提高创造性
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
      
      return NextResponse.json({ error: `AI 调用失败: ${errorText}` }, { status: resp.status });
    }

    const data = await resp.json();
    console.log("豆包 API 响应:", data);

    // 提取 AI 的回复内容
    let reply: string = data.choices?.[0]?.message?.content || "";
    console.log("[AI Route] AI原始回复:", reply);

    // 🧠 提取 JSON 计划
    const internalPlan = extractJson(reply);
    console.log("[AI Route] 提取的计划数据:", internalPlan);

    // 🧼 去掉 JSON 内容，保留纯文本回复
    // 支持多种格式的JSON代码块
    reply = reply
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .trim();

    // 转换计划格式以适配前端
    const frontendPlan = internalPlan ? convertPlanForFrontend(internalPlan) : undefined;
    console.log("[AI Route] 转换后的前端计划:", frontendPlan);

    // 返回纯文本回复和解析出的计划（如果有的话）
    return NextResponse.json({
      reply,
      plan: frontendPlan, // 这个 plan 可以被前端用来"一键添加到目标"
    });
  } catch (err) {
    console.error("[AI Route] 发生错误：", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}