import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const culqiWebhookSecret = Deno.env.get("CULQI_WEBHOOK_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body for signature verification
    const body = await req.text();
    const event = JSON.parse(body);

    // Verify webhook signature (Culqi sends signature in header)
    const signature = req.headers.get("x-culqi-signature");
    if (culqiWebhookSecret && signature) {
      // TODO: Implement signature verification based on Culqi docs
      // const isValid = verifySignature(body, signature, culqiWebhookSecret);
      // if (!isValid) throw new Error("Invalid webhook signature");
    }

    const eventType = event.type;
    const eventData = event.data;

    console.log(`Processing webhook event: ${eventType}`);

    switch (eventType) {
      case "charge.creation.succeeded":
      case "subscription.created": {
        // Payment successful - activate subscription
        const userId = eventData.metadata?.user_id;
        if (!userId) {
          console.error("No user_id in metadata");
          break;
        }

        const subscriptionEndsAt = new Date();
        subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);

        await supabase
          .from("user_profiles")
          .update({
            subscription_status: "active",
            subscription_ends_at: subscriptionEndsAt.toISOString(),
            trial_ends_at: null, // Clear trial since they're now active
          })
          .eq("id", userId);

        console.log(`Activated subscription for user: ${userId}`);
        break;
      }

      case "subscription.updated": {
        const userId = eventData.metadata?.user_id;
        if (!userId) break;

        // Update subscription end date
        if (eventData.current_period_end) {
          const subscriptionEndsAt = new Date(eventData.current_period_end * 1000);
          await supabase
            .from("user_profiles")
            .update({
              subscription_ends_at: subscriptionEndsAt.toISOString(),
            })
            .eq("id", userId);
        }
        break;
      }

      case "subscription.deleted":
      case "subscription.cancelled": {
        const userId = eventData.metadata?.user_id;
        if (!userId) break;

        await supabase
          .from("user_profiles")
          .update({
            subscription_status: "canceled",
          })
          .eq("id", userId);

        console.log(`Cancelled subscription for user: ${userId}`);
        break;
      }

      case "charge.creation.failed": {
        const userId = eventData.metadata?.user_id;
        if (!userId) break;

        await supabase
          .from("user_profiles")
          .update({
            subscription_status: "past_due",
          })
          .eq("id", userId);

        console.log(`Payment failed for user: ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
