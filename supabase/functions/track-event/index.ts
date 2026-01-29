import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackEventRequest {
  user_id: string;
  timestamp: string;
  app_name: string;
  window_title?: string;
  url?: string;
  duration_seconds: number;
  is_idle: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const event: TrackEventRequest = await req.json();

    // Validate required fields
    if (!event.user_id || !event.timestamp || !event.app_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, timestamp, app_name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Verify user exists (basic validation)
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", event.user_id)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user_id" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Insert the event
    const { error: insertError } = await supabase.from("events").insert({
      user_id: event.user_id,
      timestamp: event.timestamp,
      app_name: event.app_name,
      window_title: event.window_title || "",
      url: event.url || null,
      duration_seconds: event.duration_seconds || 0,
      is_idle: event.is_idle || false,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save event" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
