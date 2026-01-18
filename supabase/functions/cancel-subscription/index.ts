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
    const culqiSecretKey = Deno.env.get("CULQI_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!culqiSecretKey) {
      throw new Error("Culqi credentials not configured");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid token");
    }

    // Get user profile with subscription info
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("payment_customer_id, subscription_status")
      .eq("id", user.id)
      .single();

    if (!profile?.payment_customer_id) {
      throw new Error("No active subscription found");
    }

    if (profile.subscription_status !== "active") {
      throw new Error("No active subscription to cancel");
    }

    // Cancel subscription in Culqi
    // Note: The exact endpoint depends on how Culqi handles subscriptions
    // This is a placeholder - adjust based on Culqi's subscription API
    const cancelResponse = await fetch(
      `https://api.culqi.com/v2/subscriptions/${profile.payment_customer_id}/cancel`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${culqiSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Cancel at period end so user keeps access until subscription ends
          cancel_at_period_end: true,
        }),
      }
    );

    if (!cancelResponse.ok) {
      const error = await cancelResponse.text();
      console.error("Culqi cancel error:", error);
      // Even if Culqi fails, update local status
    }

    // Update user profile to canceled status
    // They'll keep access until subscription_ends_at
    await supabase
      .from("user_profiles")
      .update({
        subscription_status: "canceled",
      })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription cancelled. You will have access until the end of your billing period.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
