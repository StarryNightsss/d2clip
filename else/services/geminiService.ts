import { GoogleGenAI } from "@google/genai";
import { TREND_DATA } from '../constants';

const getSystemInstruction = () => {
  const trendContext = TREND_DATA.map(t => 
    `- ${t.title} (${t.style}): ${t.content}`
  ).join('\n');

  return `You are the AI Trend Analyst for "Aura Beauty AI", an intelligent beauty trend analysis platform.
  Your tone is professional, insightful, and trend-forward. You help users understand beauty trends, color palettes, and market dynamics.
  
  Here is some current trend data we have analyzed:
  ${trendContext}
  
  Answer user questions about beauty trends, color design, and market insights.
  Keep answers concise and data-driven.`;
};

export const sendMessageToGemini = async (history: {role: string, text: string}[], newMessage: string): Promise<string> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return "系统错误：未配置 API Key。";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: getSystemInstruction(),
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "抱歉，AI 分析引擎暂时无法响应，请稍后再试。";
  }
};
