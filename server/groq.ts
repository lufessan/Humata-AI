import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const REASONING_MODEL = "llama-3.3-70b-versatile";
const GOOGLE_VISION_MODEL = "gemini-1.5-pro";

if (!GROQ_API_KEY) {
  console.error("[Groq] CRITICAL: No GROQ_API_KEY environment variable is set!");
} else {
  console.log(`[Groq] API key configured, using model: ${REASONING_MODEL} (reasoning)`);
}

if (!GOOGLE_API_KEY) {
  console.error("[Google] WARNING: No GOOGLE_API_KEY environment variable is set! Vision features will be limited.");
} else {
  console.log(`[Google] API key configured, using model: ${GOOGLE_VISION_MODEL} (vision)`);
}

const groq = new Groq({
  apiKey: GROQ_API_KEY || "",
});

const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

export interface GroqChatOptions {
  systemPrompt?: string;
  base64Data?: string;
  mimeType?: string;
  fileName?: string;
  enableGrounding?: boolean;
  files?: Array<{ base64Data: string; mimeType: string; fileName: string }>;
}

export function getApiKeyStatus() {
  return {
    total: (GROQ_API_KEY ? 1 : 0) + (GOOGLE_API_KEY ? 1 : 0),
    available: (GROQ_API_KEY ? 1 : 0) + (GOOGLE_API_KEY ? 1 : 0),
    failed: 0
  };
}

const HUMATA_SYSTEM_PROMPT = `You are Humata AI. In 'Scientific Mode', explain concepts step-by-step. In 'Doctor Mode', provide guidance with disclaimers. In 'Khedive Mode', speak historically.

IMPORTANT LANGUAGE REQUIREMENT: You must output ONLY in standard Arabic (العربية الفصحى). Do not use Chinese, English, Latin, or any other non-Arabic characters whatsoever. Translate ALL technical terms to Arabic. Ensure the text is 100% pure Arabic script only. Never mix languages.

CRITICAL OUTPUT REQUIREMENT: Your responses MUST be clean, readable, professional prose. AVOID using any decorative Markdown characters like asterisks (*), hashtags (#), backticks (\`), or excessive formatting symbols. Focus on clear, clean text only. Use simple line breaks for paragraph separation instead of Markdown formatting.`;

async function analyzeImageWithGoogle(base64Data: string, mimeType: string): Promise<string> {
  if (!genAI || !GOOGLE_API_KEY) {
    throw new Error("لا يوجد مفتاح Google API متاح - يرجى إضافة GOOGLE_API_KEY");
  }

  console.log(`[Google Vision] Analyzing image with ${GOOGLE_VISION_MODEL}`);

  try {
    const model = genAI.getGenerativeModel({ model: GOOGLE_VISION_MODEL });

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const prompt = "Extract all text, formulas, and describe diagrams in this image in extreme detail so a blind person could understand it. Be precise about mathematical notation, symbols, and any technical content. Describe spatial relationships and layouts clearly.";

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const description = response.text();

    if (!description) {
      throw new Error("No description generated from Google vision model");
    }

    console.log(`[Google Vision] Image analysis complete - ${description.length} chars`);
    return description;
  } catch (error: any) {
    console.error("[Google Vision] Error:", error.message);
    
    if (error.status === 429 || error.message?.includes("quota") || error.message?.includes("rate")) {
      console.log("[Google Vision] Rate limited, waiting and retrying...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      return analyzeImageWithGoogle(base64Data, mimeType);
    }
    
    throw error;
  }
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: string; content: string }> = [],
  options: GroqChatOptions = {}
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("لا يوجد مفتاح API متاح - يرجى إضافة GROQ_API_KEY");
  }

  try {
    let imageDescription = "";

    if (options.base64Data && options.mimeType && options.mimeType.startsWith("image/")) {
      if (genAI && GOOGLE_API_KEY) {
        console.log(`[Hybrid] Step 1: Google Vision analysis for uploaded image`);
        imageDescription = await analyzeImageWithGoogle(options.base64Data, options.mimeType);
      } else {
        console.log(`[Hybrid] Skipping vision - no Google API key available`);
      }
    }

    if (options.files && options.files.length > 0) {
      for (const file of options.files) {
        if (file.mimeType.startsWith("image/")) {
          if (genAI && GOOGLE_API_KEY) {
            console.log(`[Hybrid] Step 1: Google Vision analysis for file: ${file.fileName}`);
            const desc = await analyzeImageWithGoogle(file.base64Data, file.mimeType);
            imageDescription += `\n\n[Image: ${file.fileName}]\n${desc}`;
          }
        }
      }
    }

    console.log(`[Hybrid] Step 2: Groq Reasoning with ${REASONING_MODEL}`);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

    let systemPrompt = HUMATA_SYSTEM_PROMPT;
    if (options.systemPrompt) {
      systemPrompt = `${HUMATA_SYSTEM_PROMPT}\n\n${options.systemPrompt}`;
    }

    messages.push({
      role: "system",
      content: systemPrompt,
    });

    for (const msg of history) {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    }

    let userMessage = message;
    if (imageDescription) {
      userMessage = `[Image Content Description]:\n${imageDescription}\n\n[User Question]:\n${message}`;
    }

    messages.push({
      role: "user",
      content: userMessage,
    });

    console.log(`[Hybrid] Sending Groq reasoning request - messagesCount: ${messages.length}, hasImageDescription: ${!!imageDescription}`);

    const completion = await groq.chat.completions.create({
      model: REASONING_MODEL,
      messages: messages,
      max_tokens: 4096,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error("No response generated from AI");
    }

    console.log(`[Hybrid] Response received successfully`);
    return responseText;
  } catch (error: any) {
    console.error("[Hybrid] API error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    if (error.status === 429 || error.message?.includes("rate") || error.message?.includes("limit")) {
      console.log("[Hybrid] Rate limited on reasoning, waiting and retrying...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      return sendChatMessage(message, history, options);
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
    console.log(`[Hybrid] uploadFileToGemini called - file: ${fileName}, mimeType: ${mimeType}`);
    console.log(`[Hybrid] File path: ${filePath}`);

    const fileBytes = fs.readFileSync(filePath);
    console.log(`[Hybrid] File read successfully - size: ${fileBytes.length} bytes`);

    const base64Data = fileBytes.toString("base64");
    console.log(`[Hybrid] File converted to base64 - length: ${base64Data.length}`);

    return {
      base64Data,
      mimeType,
      fileName,
    };
  } catch (error: any) {
    console.error("[Hybrid] File upload error:", error);
    console.error("[Hybrid] Error stack:", error.stack);
    throw new Error(error.message || "Failed to process file");
  }
}
