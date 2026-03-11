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
    const wordTarget = Math.round((speechLength / 60) * 150);

    const text = await callLLM(
      `Write a short example speech for an elementary school student.

Topic: "${topic}"

Write it like a confident 3rd or 4th grader: short sentences, simple everyday words, concrete examples from school or home. Be enthusiastic and friendly. The speech should be about ${wordTarget} words long (for a ${speechLength}-second speech).

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "ai_example": "<the example speech, about ${wordTarget} words>" }`,
      req.signal
    );

    const result = parseLLMJson(text);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
