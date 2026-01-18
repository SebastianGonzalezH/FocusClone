import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Event {
  id: number;
  app_name: string;
  window_title: string;
  url?: string;
}

interface Category {
  id: number;
  name: string;
}

interface CategorizeRequest {
  events: Event[];
  categories: Category[];
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const { events, categories, user_id }: CategorizeRequest = await req.json();

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ categorized: [], message: "No events to categorize" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt
    const categoryList = categories.map((c) => `- ${c.name} (id: ${c.id})`).join("\n");
    const eventList = events
      .map((e, i) => {
        let line = `${i + 1}. [id:${e.id}] App: "${e.app_name}", Window: "${e.window_title || 'untitled'}"`;
        if (e.url) {
          line += `, URL: "${e.url}"`;
        }
        return line;
      })
      .join("\n");

    const prompt = `You are a precise activity categorizer for a time-tracking app. Classify each computer usage event into exactly one category.

Available Categories:
${categoryList}

Events to categorize:
${eventList}

CRITICAL - CONTENT-BASED CLASSIFICATION:
You must analyze the CONTENT of what the user is doing, not just the app name. Two YouTube videos can be completely different activities!

WORK VS ENTERTAINMENT - Analyze window titles and URLs carefully:

YouTube/Video Sites - Check the video title for context:
- WORK: tutorials, conference talks, "Y Combinator", "How to", tech talks, programming, business strategy, startup advice, documentation, educational content → Deep Work or learning category
- ENTERTAINMENT: sports highlights, gaming, music videos, vlogs, comedy, celebrities, athletes (e.g., "Max Verstappen", "best moments", "highlights"), TV clips → Entertainment/Leisure category
- If the title mentions specific athletes, celebrities, entertainers, or gaming → Entertainment
- If the title mentions programming, business, startups, learning, tutorials → Deep Work

Coding & Development:
- IDEs (VS Code, Xcode, IntelliJ), terminals, GitHub, Stack Overflow → Deep Work or coding category
- Documentation sites, API references, technical blogs → Deep Work

Communication:
- Video calls (Zoom, Google Meet, Microsoft Teams) → Meetings
- Chat apps (Slack, Discord, Messages), email → Communication

URL Domain Hints:
- github.com, stackoverflow.com, docs.*, developer.*, medium.com (tech articles) → Deep Work
- youtube.com → CHECK THE TITLE - could be work OR entertainment
- twitter.com, x.com, reddit.com, instagram.com, tiktok.com → Social/Entertainment
- netflix.com, twitch.tv, spotify.com → Entertainment
- news sites, entertainment portals → Entertainment/Leisure

System & Admin:
- Finder, Settings, System Preferences → Admin category
- File management, downloads → Admin

Return ONLY a valid JSON array with this exact format, no other text:
[{"event_id": <id>, "category_id": <id>}, ...]

REMEMBER: The same app (like YouTube or Chrome) can be used for VERY different purposes. Always analyze the window title to determine the actual activity type.`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a precise JSON-outputting assistant. Only output valid JSON arrays, no markdown, no explanations.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let categorized;
    try {
      // Remove any markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      categorized = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid JSON from OpenAI");
    }

    return new Response(
      JSON.stringify({
        categorized,
        count: categorized.length,
        message: `Successfully categorized ${categorized.length} events`
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
