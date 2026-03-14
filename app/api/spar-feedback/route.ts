import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";
import { sparFeedbackPrompt } from "@/lib/prompts/spar";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }
  try {
    const { resolution, userSide, userName, aiConstructive, aiRebuttal, userConstructive, userCrossfire, userRebuttal } = await req.json();

    const prompt = sparFeedbackPrompt({ resolution, userSide, userName, aiConstructive, aiRebuttal, userConstructive, userCrossfire, userRebuttal });
    const text = await callLLM(prompt, req.signal);

    const feedback = parseLLMJson(text);
    return NextResponse.json(feedback);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
