import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const { topic, userTranscript, aiExample } = await req.json();

    const text = await callLLM(
      `You are a kind speech coach helping an elementary school student understand how to improve their speech.

Topic: "${topic}"

Student's speech:
"""
${userTranscript}
"""

Improved AI example:
"""
${aiExample}
"""

The AI example is a polished rewrite of the student's own speech — same ideas, same points, same examples, just expressed better. Compare the two line by line and explain exactly what improved in the writing and delivery. Every bullet point must refer to something the student actually said and how the example said it better.

Rules:
- ONLY compare what is actually in both speeches — do NOT comment on ideas or examples that weren't in the student's speech
- Be specific: quote or closely reference the student's words and show what changed
- Use simple language (3rd–4th grade level)
- 3–5 bullet points max
- Start each bullet with "- "
- Do NOT start with "Sure", "Ok", "Here is", or any filler

OUTPUT: Output ONLY the bullet points. Nothing else.`,
      req.signal
    );

    const explanation = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/^(sure[,!.]?|ok[,!.]?|of course[,!.]?|here('s| is)[^.]*[.!])\s*/i, "")
      .trim();

    return NextResponse.json({ explanation });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
