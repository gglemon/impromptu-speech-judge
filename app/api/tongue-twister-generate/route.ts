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
    const { difficulty } = await req.json();

    const difficultyGuide =
      difficulty === "easy"
        ? "Use 1-2 repeated sounds. Keep it short (one sentence, under 10 words). Great for young kids."
        : difficulty === "hard"
        ? "Use 3+ repeated sounds that are very similar (like s/sh/ch, p/b, t/d/th). Make it long (2 sentences) and very challenging even for adults."
        : "Use 2-3 repeated sounds. Medium length (one sentence, 10-15 words). Challenging but doable for a 5th or 6th grader.";

    const text = await callLLM(
      `Generate a single original tongue twister for speech practice.

Difficulty: ${difficulty}
Guide: ${difficultyGuide}

Rules:
- It must actually be a tongue twister (repeated similar sounds that are hard to say fast)
- It must make some logical sense (not just random words)
- Do NOT use famous tongue twisters like "she sells seashells" or "Peter Piper"
- Be creative and fun

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "twister": "<the tongue twister text>" }`,
      req.signal
    );

    const result = parseLLMJson(text);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
