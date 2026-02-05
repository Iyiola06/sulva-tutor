
import { GoogleGenAI, Type } from "@google/genai";
import { QuizMode, Quiz, GradingResult } from "../types";

// Always initialize with apiKey: process.env.API_KEY directly inside service functions
export const generateQuiz = async (sourceText: string, mode: QuizMode, count: number): Promise<Quiz> => {
  // Fix: Use process.env.API_KEY directly in constructor as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are an expert tutor. Create exactly ${count} high-quality questions based on the provided text.
    Mode: ${mode}.
    Always return valid JSON. 
    Do not mention your model name or provider in the content.
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
            correctAnswer: { type: Type.INTEGER, description: "Index of correct option (0-3)" },
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
            question: { type: Type.STRING, description: "Sentence with ___ for the gap" },
            correctAnswer: { type: Type.STRING, description: "The correct missing word(s)" },
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
            keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            explanation: { type: Type.STRING, description: "Model sample answer" }
          },
          required: ["question", "keyConcepts", "explanation"]
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

  // Basic Text Tasks use gemini-3-flash-preview
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Material to analyze: ${sourceText.substring(0, 15000)}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schemaMap[mode] as any,
    },
  });

  const rawData = JSON.parse(response.text || "{}");
  return {
    mode,
    questions: rawData.questions || []
  };
};

export const gradeHandwrittenAnswer = async (
  imageBase64: string, 
  question: string, 
  context: string
): Promise<GradingResult> => {
  // Fix: Initialize GoogleGenAI directly with process.env.API_KEY right before making the call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Complex reasoning tasks (handwriting OCR + theory evaluation) use gemini-3-pro-preview
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64.split(',')[1] || imageBase64,
          },
        },
        {
          text: `
            Analyze this image of a handwritten answer.
            Reference Material: ${context.substring(0, 5000)}
            Question: ${question}
            
            Tasks:
            1. Determine if there is actually any handwriting in the image. Set "noHandwritingDetected" to true if the image is blank, blurry, or contains no readable handwritten text.
            2. If handwriting is found:
               - Transcribe it.
               - Assign a score (0-100).
               - Provide feedback.
            3. If no handwriting is found:
               - Set score to 0.
               - Briefly explain why in the feedback.
          `
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
