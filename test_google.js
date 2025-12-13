// test_google.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// هذا هو المفتاح الأول من قائمتك
const ;

async function checkAvailableModels() {
  console.log("🔍 جاري الاتصال بجوجل...");

  // رابط مباشر لفحص الموديلات
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
      console.log("\n✅ مبروك! المفتاح يعمل بنجاح.");
      console.log("📋 هذه هي أسماء الموديلات المتاحة لك:");
      
      data.models.forEach(m => {
        if (m.name.includes("gemini")) {
            console.log(` - ${m.name.replace('models/', '')}`);
        }
      });
    } else {
      console.log("\n❌ رد غير متوقع من جوجل:");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ خطأ في الاتصال:", error.message);
  }
}

checkAvailableModels();