import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Kiwify assina o corpo da requisição com HMAC-SHA1 (token do webhook) e envia
// o resultado no parâmetro de query "signature".
const hmacSha1Hex = async (secret: string, body: string) => {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const safeEqual = (a: string, b: string) => {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookSecret = Deno.env.get('KIWIFY_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('KIWIFY_WEBHOOK_SECRET not configured')
      return new Response('Webhook secret not configured', {
        status: 500,
        headers: corsHeaders
      })
    }

    // Valida a assinatura ANTES de confiar em qualquer dado do payload
    const rawBody = await req.text()
    const receivedSignature = new URL(req.url).searchParams.get('signature') ?? ''
    const expectedSignature = await hmacSha1Hex(webhookSecret, rawBody)
    if (!receivedSignature || !safeEqual(receivedSignature.toLowerCase(), expectedSignature)) {
      console.error('Invalid or missing Kiwify signature')
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      })
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody)
    console.log('Received Kiwify webhook:', payload.webhook_event_type || payload.order?.webhook_event_type)

    // Handle payment success events from Kiwify
    if (payload.order?.order_status === 'paid' || 
        payload.order?.webhook_event_type === 'order_approved' ||
        payload.order_status === 'paid' ||
        payload.webhook_event_type === 'order_approved') {
      
      // Kiwify envia o cliente no topo do payload; mantém o formato aninhado como fallback
      const customerEmail = payload.Customer?.email || payload.order?.Customer?.email
      
      if (!customerEmail) {
        console.error('No customer email found in Kiwify webhook payload')
        return new Response('No customer email found', { 
          status: 400,
          headers: corsHeaders 
        })
      }

      console.log(`Processing Kiwify payment success for: ${customerEmail}`)

      // Update user plan to premium in profiles table
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .update({ 
          plan: 'premium',
          updated_at: new Date().toISOString()
        })
        .eq('email', customerEmail)
        .select()

      if (profileError) {
        console.error('Error updating profile:', profileError)
        return new Response('Error updating user plan', { 
          status: 500,
          headers: corsHeaders 
        })
      }

      if (!profile || profile.length === 0) {
        console.error(`No user found with email: ${customerEmail}`)
        return new Response('User not found', { 
          status: 404,
          headers: corsHeaders 
        })
      }

      console.log(`Successfully updated plan to premium for user: ${customerEmail} - Profile ID: ${profile[0].id}`)

      // Also update in subscribers table if it exists
      const { error: subscriberError } = await supabaseClient
        .from('subscribers')
        .upsert({
          user_id: profile[0].id,
          email: customerEmail,
          subscribed: true,
          subscription_tier: 'Premium',
          updated_at: new Date().toISOString()
        })

      if (subscriberError) {
        console.error('Error updating subscriber:', subscriberError)
        // Don't fail the request if subscribers table update fails
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Plan updated successfully',
        user: customerEmail,
        order_id: payload.order_id || payload.order?.order_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle other webhook events
    console.log('Kiwify webhook event not handled:', payload.order?.webhook_event_type || payload.order?.order_status)
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook received but no action taken' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error processing Kiwify webhook:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})