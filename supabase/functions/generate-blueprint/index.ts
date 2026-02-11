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
        const { sourceText } = await req.json()

        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not set')
        }

        const ai = new GoogleGenAI({ apiKey })

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create a study map for: ${sourceText.substring(0, 10000)}`,
            config: {
                systemInstruction: 'You are a fast educational mapper and mnemonic expert.',
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        grandMnemonic: {
                            type: Type.OBJECT,
                            properties: { acronym: { type: Type.STRING }, full: { type: Type.STRING } },
                            required: ['acronym', 'full']
                        },
                        chapters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ['title'] } },
                        potentialQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answerTip: { type: Type.STRING } }, required: ['question', 'answerTip'] } },
                        keyTerms: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } }, required: ['term', 'definition'] } }
                    },
                    required: ['summary', 'chapters', 'potentialQuestions', 'keyTerms']
                } as any,
            },
        })

        const breakdown = JSON.parse(response.text || '{}')

        return new Response(JSON.stringify(breakdown), {
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
