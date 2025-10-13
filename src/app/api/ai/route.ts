// src/app/api/ai/route.ts - 修改版 2
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
    const jsonMatch = text.match(/```json([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1].trim());
    }
    return null;
  } catch (e) {
    console.error("[AI Route] JSON 解析失败：", e);
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
    // ✅ 修改：只从前端获取 messages 数组，不再接收 apiKey
    const { messages: userMessages } = body as {
      messages: ChatMessage[];
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

    // 确保 baseUrl 不以 / 结尾
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    // System Prompt - 强化计划生成指令和 JSON 格式
    const system: ChatMessage = {
      role: "system",
      content:
        "你是 AI 任务管家，用户是你的老板。请严格遵守以下规则：\n" +
        "1. 回答必须简短、口语化，且使用与用户相同的语言。\n" +
        "2. **核心规则：每当用户表达任何关于规划、安排、组织、管理时间、设定目标、执行任务、学习复习、准备工作、创建清单或制定时间表的需求时，你都必须在回复文本之后，立即提供一个结构化的任务计划。**\n" +
        "3. **计划格式：必须使用 ```json 包裹一个 JSON 对象，该对象包含 'tasksDaily' 和 'tasksFuture' 两个数组。**\n" +
        "4. JSON 结构和含义：\n" +
        '{\n' +
        '  "tasksDaily": [{ "title": "每日任务标题 (≤30字符)", "description": "任务描述" }], // 适用于“今日待办”或“今天”、“明天”、“这周”等短期内可完成的任务\n' +
        '  "tasksFuture": [{ "title": "未来任务标题 (≤30字符)", "description": "任务描述" }]  // 适用于“近期目标”、“下个月”、“本季度”等中长期目标\n' +
        '}\n' +
        "5. title 最多 30 个字符；description 应精炼、可执行；若无对应任务，对应数组可为空 []。\n" +
        "6. **绝对重要：JSON 格式必须完全正确，不能有任何语法错误，且必须严格按照上述结构。**\n" +
        "7. **绝对重要：必须生成 JSON，即使用户没有明确要求，只要涉及规划意图就必须生成。**\n" +
        "8. **示例（仅作格式参考，实际需根据用户具体请求生成）：\n" +
        "用户：下周考雅思，帮我排 7 天复习计划\n" +
        "你：好咧，已为你安排 7 天冲刺！\n" +
        "```json\n" +
        '{\n' +
        '  "tasksDaily": [\n' +
        '    { "title": "雅思听力训练", "description": "Cambridge 11 Test 1 + 精听" },\n' +
        '    { "title": "雅思阅读训练", "description": "Cambridge 11 Test 2 Reading" }\n' +
        '  ],\n' +
        '  "tasksFuture": [\n' +
        '    { "title": "口语模拟考试", "description": "找搭档进行全真模拟" },\n' +
        '    { "title": "作文批改", "description": "提交一篇大作文给老师批改" }\n' +
        '  ]\n' +
        '}\n' +
        "```\n" +
        "**请务必严格遵循以上所有规则。**",
    };

    // 将 system message 放在第一位，然后是用户发送的最新消息
    // 注意：现在前端只发送最新的 user message，所以这里是 [system, user_message]
    const messages: ChatMessage[] = [system, ...userMessages];

    const endpoint = `${baseUrl}/chat/completions`;

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

    // 🧠 提取 JSON 计划
    const internalPlan = extractJson(reply);

    // 🧼 去掉 JSON 内容，保留纯文本回复
    reply = reply.replace(/```json[\s\S]*?```/, "").trim();

    // 转换计划格式以适配前端
    const frontendPlan = internalPlan ? convertPlanForFrontend(internalPlan) : undefined;

    // 返回纯文本回复和解析出的计划（如果有的话）
    return NextResponse.json({
      reply,
      plan: frontendPlan, // 这个 plan 可以被前端用来“一键添加到目标”
    });
  } catch (err) {
    console.error("[AI Route] 发生错误：", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}