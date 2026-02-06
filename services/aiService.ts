
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizMode, Quiz, GradingResult, StudyBreakdown } from "../types";

// Base64 decoder for raw audio data
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const generateQuiz = async (sourceText: string, mode: QuizMode, count: number): Promise<Quiz> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are an expert tutor. Create exactly ${count} high-quality questions based on the provided text.
    Mode: ${mode}.
    
    CRITICAL INSTRUCTION FOR MULTIPLE CHOICE:
    - You MUST randomize the position of the correct answer. 
    - Ensure an even distribution of correct answer indices (0, 1, 2, and 3). 
    - Always return valid JSON. 
  `;

  const mcqSchema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    },
    required: ["questions"]
  };

  const gapSchema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "correctAnswer", "explanation"]
        }
      }
    },
    required: ["questions"]
  };

  const theorySchema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "explanation"]
        }
      }
    },
    required: ["questions"]
  };

  const schemaMap = {
    [QuizMode.MULTIPLE_CHOICE]: mcqSchema,
    [QuizMode.FILL_GAP]: gapSchema,
    [QuizMode.THEORY]: theorySchema,
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Material: ${sourceText.substring(0, 15000)}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schemaMap[mode] as any,
    },
  });

  try {
    const rawData = JSON.parse(response.text || "{}");
    return { mode, questions: rawData.questions || [] };
  } catch (e) {
    return { mode, questions: [] };
  }
};

export const generateIllustration = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A clean, professional 3D educational illustration for a student about: ${prompt}. Minimalist background, high contrast, vibrant brand purple accents.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this clearly and supportively: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return decodeBase64(base64Audio);
    }
    return null;
  } catch (e) {
    console.error("Speech generation failed", e);
    return null;
  }
};

export const generateStudyBlueprint = async (sourceText: string): Promise<StudyBreakdown> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create a study map for: ${sourceText.substring(0, 10000)}`,
    config: {
      systemInstruction: "You are a fast educational mapper and mnemonic expert.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          grandMnemonic: {
            type: Type.OBJECT,
            properties: { acronym: { type: Type.STRING }, full: { type: Type.STRING } },
            required: ["acronym", "full"]
          },
          chapters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ["title"] } },
          potentialQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answerTip: { type: Type.STRING } }, required: ["question", "answerTip"] } },
          keyTerms: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } }, required: ["term", "definition"] } }
        },
        required: ["summary", "chapters", "potentialQuestions", "keyTerms"]
      } as any,
    },
  });
  return JSON.parse(response.text || "{}");
};

export const generateChapterDetails = async (title: string, text: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze chapter "${title}" from: ${text.substring(0, 15000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keyPoints: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ["title", "content"] } },
          mnemonic: { type: Type.OBJECT, properties: { acronym: { type: Type.STRING }, phrase: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["acronym", "phrase", "description"] }
        },
        required: ["keyPoints"]
      } as any,
    },
  });
  return JSON.parse(response.text || "{}");
};

export const askFollowUpQuestion = async (userQuestion: string, title: string, content: string, fullText: string, history: any[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { systemInstruction: `You are an expert tutor. Chapter: ${title}.` },
    history: history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }))
  });
  const response = await chat.sendMessage({ message: `Context: ${content}. Question: ${userQuestion}` });
  return response.text || "No response received.";
};

const GRADING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ocrText: { type: Type.STRING },
    score: { type: Type.NUMBER },
    feedback: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
    noHandwritingDetected: { type: Type.BOOLEAN }
  },
  required: ["ocrText", "score", "feedback", "strengths", "weaknesses", "noHandwritingDetected"]
};

export const gradeHandwrittenAnswer = async (img: string, q: string, ctx: string): Promise<GradingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: img.includes(',') ? img.split(',')[1] : img } },
        { text: `Grade handwriting for: "${q}" using context: "${ctx.substring(0, 5000)}"` }
      ]
    },
    config: { responseMimeType: "application/json", responseSchema: GRADING_SCHEMA as any }
  });
  return JSON.parse(response.text || "{}");
};

export const gradeTypedAnswer = async (answer: string, q: string, ctx: string): Promise<GradingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Grade this typed answer: "${answer}" for question: "${q}" using context: "${ctx.substring(0, 5000)}"`,
    config: { responseMimeType: "application/json", responseSchema: GRADING_SCHEMA as any }
  });
  return JSON.parse(response.text || "{}");
};
