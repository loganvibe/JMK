import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "google/gemini-3-flash-preview";

async function callAI(system: string, user: string, jsonMode = false) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const body: any = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("AI gateway", res.status, t);
    const status = res.status === 429 || res.status === 402 ? res.status : 500;
    const msg =
      res.status === 429
        ? "AI is busy right now. Please try again shortly."
        : res.status === 402
        ? "AI credits exhausted. Please upgrade to continue."
        : "AI request failed.";
    throw Object.assign(new Error(msg), { status });
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function parseJson(raw: string) {
  try { return JSON.parse(raw); } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const action: string = body.action;
    const text: string = (body.text ?? "").toString().slice(0, 80000);
    const profile = body.profile ?? {};
    const answers = body.answers ?? {};

    if (action === "analyze") {
      const system = `You are an expert academic evaluator for Nigerian university final-year projects.
Analyze the uploaded project draft and return STRICT JSON only:
{
  "title": "detected title or empty",
  "abstract": "detected abstract or empty",
  "detected_chapters": ["Chapter 1: ...", "..."],
  "scores": {
    "structure": 0-100,
    "research_quality": 0-100,
    "writing_quality": 0-100,
    "completeness": 0-100,
    "overall": 0-100
  },
  "missing_sections": ["..."],
  "weak_arguments": ["..."],
  "formatting_issues": ["..."],
  "outdated_information": ["..."],
  "repeated_content": ["..."],
  "improvement_areas": ["..."],
  "recommendations": [
    { "title": "short title", "detail": "what to do", "target_section": "Chapter 2: Literature Review" }
  ],
  "summary": "2-3 sentence overall assessment"
}
No markdown, no commentary.`;
      const user = `Project draft:\n"""\n${text}\n"""`;
      const raw = await callAI(system, user, true);
      return new Response(JSON.stringify(parseJson(raw)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "refine_section") {
      const sectionName: string = body.section ?? "Section";
      const original: string = (body.original ?? "").toString().slice(0, 20000);
      const instruction: string = body.instruction ?? "improve";

      const system = `You are an expert academic writing assistant helping refine a Nigerian university final-year project.
Rewrite the given section to be stronger while preserving the student's intent.
Return STRICT JSON only:
{
  "new_content": "the improved section in clean Markdown",
  "change_summary": "1-3 sentences describing WHAT changed and WHY",
  "changes": ["bullet of concrete change", "..."]
}
Use British English, formal academic tone, placeholder citations like (Author, 2023) where appropriate.`;

      const user = `Student university: ${profile.university ?? "N/A"}
Department: ${profile.department ?? answers.department ?? "N/A"}
Supervisor feedback: ${answers.supervisor_feedback ?? "N/A"}
Focus areas: ${answers.focus_areas ?? "N/A"}
Keep topic same? ${answers.keep_topic ?? "yes"}

Refinement instruction: ${instruction}
Section: ${sectionName}

ORIGINAL:
"""
${original}
"""`;
      const raw = await callAI(system, user, true);
      return new Response(JSON.stringify(parseJson(raw)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "split_sections") {
      // Split extracted text into logical section chunks
      const system = `You are given the raw text of a student's project. Split it into sections.
Return STRICT JSON only:
{
  "sections": [
    { "chapter": "Chapter 1: Introduction", "section": "Background of Study", "content": "..." }
  ]
}
Merge fragments smartly. Do not invent content — only split what is present.`;
      const raw = await callAI(system, `Text:\n"""\n${text}\n"""`, true);
      return new Response(JSON.stringify(parseJson(raw)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("refine-project error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), {
      status: e?.status ?? 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
