import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Comparação em tempo constante para não vazar o segredo por diferença de tempo
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

    // Get the webhook secret (try both CAKTO and KIRVANO secrets)
    const webhookSecret = Deno.env.get('CAKTO_WEBHOOK_SECRET') || Deno.env.get('KIRVANO_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('Neither CAKTO_WEBHOOK_SECRET nor KIRVANO_WEBHOOK_SECRET configured')
      return new Response('Webhook secret not configured', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    // Parse the webhook payload
    const payload = await req.json()

    // O segredo é OBRIGATÓRIO (no corpo ou no header). Sem isso qualquer pessoa
    // poderia liberar o plano premium para qualquer e-mail.
    const receivedSecret = String(payload?.secret ?? req.headers.get('x-webhook-secret') ?? '')
    if (!receivedSecret || !safeEqual(receivedSecret, webhookSecret)) {
      console.error('Invalid or missing webhook secret')
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      })
    }

    console.log('Received Cakto webhook:', payload.event || payload.status)

    // Handle payment success events from Cakto, Kirvano and Kiwify
    if (payload.event === 'purchase_approved' || 
        payload.event === 'subscription_created' || 
        payload.event === 'SALE_APPROVED' || 
        payload.status === 'paid' || 
        payload.status === 'approved' || 
        payload.status === 'APPROVED' ||
        payload.order?.order_status === 'paid' ||
        payload.order?.webhook_event_type === 'order_approved') {
      
      const customerEmail = payload.customer?.email || 
                           payload.email || 
                           payload.order?.Customer?.email
      
      if (!customerEmail) {
        console.error('No customer email found in webhook payload')
        return new Response('No customer email found', { 
          status: 400,
          headers: corsHeaders 
        })
      }

      console.log(`Processing payment success for: ${customerEmail}`)

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
        user: customerEmail
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle other webhook events
    console.log('Webhook event not handled:', payload.event || payload.status)
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook received but no action taken' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})