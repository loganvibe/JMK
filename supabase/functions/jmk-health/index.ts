import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const hasToken = authHeader.startsWith("Bearer ") && authHeader.length > 7;

  return new Response(
    JSON.stringify({
      success: true,
      service: "jmk-health",
      supabase_project: "vkwpcxbizxwlcgjtxwxo",
      has_auth: hasToken,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
