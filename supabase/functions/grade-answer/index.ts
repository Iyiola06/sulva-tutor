import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenAI, Type } from 'npm:@google/genai@^1.40.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    required: ['ocrText', 'score', 'feedback', 'strengths', 'weaknesses', 'noHandwritingDetected']
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { imageData, typedAnswer, question, context } = await req.json()

        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not set')
        }

        const ai = new GoogleGenAI({ apiKey })

        let response

        if (imageData) {
            // Grade handwritten answer
            const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData
            response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: `Grade handwriting for: "${question}" using context: "${context.substring(0, 5000)}"` }
                    ]
                },
                config: { responseMimeType: 'application/json', responseSchema: GRADING_SCHEMA as any }
            })
        } else if (typedAnswer) {
            // Grade typed answer
            response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Grade this typed answer: "${typedAnswer}" for question: "${question}" using context: "${context.substring(0, 5000)}"`,
                config: { responseMimeType: 'application/json', responseSchema: GRADING_SCHEMA as any }
            })
        } else {
            throw new Error('Either imageData or typedAnswer is required')
        }

        const result = JSON.parse(response.text || '{}')

        return new Response(JSON.stringify(result), {
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
