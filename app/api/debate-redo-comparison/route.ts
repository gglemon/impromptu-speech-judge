import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";
import { debateRedoComparisonPrompt } from "@/lib/prompts/debate";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const { resolution, side, originalTranscript, originalFeedback, redoTranscript, redoFeedback, difficulty } = await req.json();

    const prompt = debateRedoComparisonPrompt({ resolution, side, originalTranscript, originalFeedback, redoTranscript, redoFeedback, difficulty });
    const text = await callLLM(prompt, req.signal);

    return NextResponse.json(parseLLMJson(text));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
