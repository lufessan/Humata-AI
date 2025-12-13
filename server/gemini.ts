import OpenAI from "openai";
import * as fs from "fs";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL_NAME = "google/gemini-2.0-flash-exp:free";

if (!OPENROUTER_API_KEY) {
  console.error("[OpenRouter] CRITICAL: No OPENROUTER_API_KEY environment variable is set!");
} else {
  console.log(`[OpenRouter] API key configured, using model: ${MODEL_NAME}`);
}

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
});

export interface GeminiChatOptions {
  systemPrompt?: string;
  base64Data?: string;
  mimeType?: string;
  fileName?: string;
  enableGrounding?: boolean;
  files?: Array<{ base64Data: string; mimeType: string; fileName: string }>;
}

export function getApiKeyStatus() {
  return {
    total: OPENROUTER_API_KEY ? 1 : 0,
    available: OPENROUTER_API_KEY ? 1 : 0,
    failed: 0
  };
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: string; content: string }> = [],
  options: GeminiChatOptions = {}
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("لا يوجد مفتاح API متاح - يرجى إضافة OPENROUTER_API_KEY");
  }

  try {
    const messages: Array<{ role: "system" | "user" | "assistant"; content: any }> = [];

    const technicalTransparencyInstruction = `You are an AI assistant that is fully transparent about its technical specifications. If the user asks for your specific model name, model ID, or what model you are running, you MUST respond with your exact current model ID: "${MODEL_NAME}". Do not evade the question with generic responses - be direct and provide the exact model identifier.

CRITICAL OUTPUT REQUIREMENT: Your responses MUST be clean, readable, professional prose. AVOID using any decorative Markdown characters like asterisks (*), hashtags (#), backticks (\`), or excessive formatting symbols. Focus on clear, clean text only. Use simple line breaks for paragraph separation instead of Markdown formatting.`;

    let finalSystemInstruction = technicalTransparencyInstruction;
    
    if (options.systemPrompt) {
      finalSystemInstruction = `${technicalTransparencyInstruction}\n\n${options.systemPrompt}`;
    }

    messages.push({
      role: "system",
      content: finalSystemInstruction,
    });

    for (const msg of history) {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    }

    let userContent: any;

    if (options.base64Data && options.mimeType) {
      console.log(`[OpenRouter] Adding inline file data - type: ${options.mimeType}, fileName: ${options.fileName}`);
      
      if (options.mimeType.startsWith("image/")) {
        userContent = [
          {
            type: "image_url",
            image_url: {
              url: `data:${options.mimeType};base64,${options.base64Data}`,
            },
          },
          {
            type: "text",
            text: message,
          },
        ];
      } else {
        userContent = `[File: ${options.fileName}]\n\n${message}`;
      }
    } else if (options.files && options.files.length > 0) {
      const parts: any[] = [];
      for (const file of options.files) {
        console.log(`[OpenRouter] Adding file - type: ${file.mimeType}, fileName: ${file.fileName}`);
        if (file.mimeType.startsWith("image/")) {
          parts.push({
            type: "image_url",
            image_url: {
              url: `data:${file.mimeType};base64,${file.base64Data}`,
            },
          });
        }
      }
      parts.push({
        type: "text",
        text: message,
      });
      userContent = parts;
    } else {
      userContent = message;
    }

    messages.push({
      role: "user",
      content: userContent,
    });

    console.log(`[OpenRouter] Sending request - model: ${MODEL_NAME}, messagesCount: ${messages.length}, hasFile: ${!!(options.base64Data || options.files?.length)}`);

    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: messages,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error("No response generated from AI");
    }

    console.log(`[OpenRouter] Response received successfully`);
    return responseText;
  } catch (error: any) {
    console.error("[OpenRouter] API error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    if (error.status === 429 || error.message?.includes("quota") || error.message?.includes("rate")) {
      throw new Error("تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.");
    }

    if (error.message?.includes("API key") || error.status === 401) {
      throw new Error("خطأ في مفتاح API - تحقق من إعدادات الخادم");
    }

    throw new Error(error.message || "حدث خطأ في معالجة الرسالة");
  }
}

export async function uploadFileToGemini(
  filePath: string,
  mimeType: string,
  fileName: string
): Promise<{ base64Data: string; mimeType: string; fileName: string }> {
  try {
    console.log(`[OpenRouter] uploadFileToGemini called - file: ${fileName}, mimeType: ${mimeType}`);
    console.log(`[OpenRouter] File path: ${filePath}`);

    const fileBytes = fs.readFileSync(filePath);
    console.log(`[OpenRouter] File read successfully - size: ${fileBytes.length} bytes`);

    const base64Data = fileBytes.toString("base64");
    console.log(`[OpenRouter] File converted to base64 - length: ${base64Data.length}`);

    return {
      base64Data,
      mimeType,
      fileName,
    };
  } catch (error: any) {
    console.error("[OpenRouter] File upload error:", error);
    console.error("[OpenRouter] Error stack:", error.stack);
    throw new Error(error.message || "Failed to process file");
  }
}
