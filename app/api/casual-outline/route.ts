import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const { topic, speechLength = 60 } = await req.json();

    const numPoints = speechLength <= 30 ? 2 : speechLength <= 60 ? 3 : speechLength <= 90 ? 4 : 5;

    const text = await callLLM(
      `You are a speech coach helping an elementary school student plan a short speech.

Topic: "${topic}"
Speech length: ${speechLength} seconds

Create a skeleton outline — structure and placeholders ONLY. Do NOT include any actual content, examples, or opinions. Each slot should be a short label describing what kind of thing goes there (e.g. "Hook question", "Personal example", "Reason 1", "Call to action"), NOT the actual content itself. The student will fill in their own ideas.

Number of main points: ${numPoints}

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{
  "opening": "<label for the opening move, e.g. 'Hook question' or 'Surprising fact'>",
  "points": ["<label for point 1, e.g. 'Reason 1 + personal example'>", "<label for point 2>"${numPoints >= 3 ? ', "<label for point 3>"' : ""}${numPoints >= 4 ? ', "<label for point 4>"' : ""}${numPoints >= 5 ? ', "<label for point 5>"' : ""}],
  "closing": "<label for the closing move, e.g. 'Restate main idea + call to action'>"
}`,
      req.signal
    );

    const outline = parseLLMJson(text);
    return NextResponse.json(outline);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
