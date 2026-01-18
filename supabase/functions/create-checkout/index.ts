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
    const culqiPlanId = Deno.env.get("CULQI_PLAN_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!culqiSecretKey || !culqiPlanId) {
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

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email, payment_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.payment_customer_id;

    // Create Culqi customer if doesn't exist
    if (!customerId) {
      const customerResponse = await fetch("https://api.culqi.com/v2/customers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${culqiSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          first_name: user.email?.split("@")[0] || "User",
          last_name: "FocusClone",
        }),
      });

      if (!customerResponse.ok) {
        const error = await customerResponse.text();
        throw new Error(`Failed to create Culqi customer: ${error}`);
      }

      const customer = await customerResponse.json();
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from("user_profiles")
        .update({ payment_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create Culqi checkout session for subscription
    // Note: Culqi uses a different flow - you'll need to use their checkout.js
    // This returns the data needed to initialize the Culqi checkout widget
    const checkoutData = {
      public_key: Deno.env.get("CULQI_PUBLIC_KEY"),
      amount: 2500, // S/25 in cents
      currency: "PEN",
      description: "FocusClone Pro - Monthly Subscription",
      customer_id: customerId,
      metadata: {
        user_id: user.id,
        plan_id: culqiPlanId,
      },
    };

    // For Culqi, you typically redirect to a checkout page or use their JS widget
    // This returns the config needed for the frontend
    return new Response(
      JSON.stringify({
        checkout_config: checkoutData,
        // If using hosted checkout, return URL here
        // url: `https://checkout.culqi.com/...`
        message: "Checkout session created",
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
