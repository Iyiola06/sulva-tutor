import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const signature = req.headers.get('x-paystack-signature')
        const body = await req.text()

        // Verify Paystack signature
        const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
        if (!paystackSecret) {
            throw new Error('PAYSTACK_SECRET_KEY not set')
        }

        const hash = await crypto.subtle.digest(
            'SHA-512',
            new TextEncoder().encode(paystackSecret)
        )
        const hexHash = Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')

        // Calculate expected signature
        const expectedSignature = await crypto.subtle.digest(
            'SHA-512',
            new TextEncoder().encode(paystackSecret + body)
        )
        const expectedHex = Array.from(new Uint8Array(expectedSignature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')

        if (signature !== expectedHex) {
            console.error('Invalid signature')
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const event = JSON.parse(body)
        console.log('Webhook event:', event.event)

        // Process successful payment
        if (event.event === 'charge.success') {
            const { customer, metadata, amount } = event.data
            const userId = metadata?.user_id

            if (!userId) {
                console.error('No user_id in metadata')
                return new Response(
                    JSON.stringify({ error: 'Missing user_id' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Create Supabase client
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            const supabase = createClient(supabaseUrl, supabaseServiceKey)

            // Create/update subscription
            const { error } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    status: 'active',
                    plan_id: 'pro',
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                })

            if (error) {
                console.error('Database error:', error)
                return new Response(
                    JSON.stringify({ error: 'Database error' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            console.log('Subscription activated for user:', userId)
        }

        return new Response(
            JSON.stringify({ received: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
