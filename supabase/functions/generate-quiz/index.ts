import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenAI, Type } from 'npm:@google/genai@^1.40.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { sourceText, mode, count } = await req.json()

        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not set')
        }

        const ai = new GoogleGenAI({ apiKey })

        const systemInstruction = `
      You are an expert tutor. Create exactly ${count} high-quality questions based on the provided text.
      Mode: ${mode}.
      
      CRITICAL INSTRUCTION FOR MULTIPLE CHOICE:
      - You MUST randomize the position of the correct answer. 
      - Ensure an even distribution of correct answer indices (0, 1, 2, and 3). 
      - Always return valid JSON. 
    `

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
        }

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
        }

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
        }

        const schemaMap: any = {
            'Multiple Choice': mcqSchema,
            'Fill in the Gap': gapSchema,
            'Theory': theorySchema,
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Material: ${sourceText.substring(0, 15000)}`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: schemaMap[mode] as any,
            },
        })

        const rawData = JSON.parse(response.text || '{}')
        const quiz = { mode, questions: rawData.questions || [] }

        return new Response(JSON.stringify(quiz), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
