import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log('Received Cakto webhook:', JSON.stringify(payload, null, 2))

    // Verify webhook secret if provided by Cakto
    if (payload.secret && payload.secret !== webhookSecret) {
      console.error('Invalid webhook secret')
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      })
    }
    
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
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})