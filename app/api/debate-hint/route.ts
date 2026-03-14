import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";
import { debateHintPrompt } from "@/lib/prompts/debate";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const { resolution, side, round, difficulty, previousArguments } = await req.json();

    const prompt = debateHintPrompt({ resolution, side, round, difficulty, previousArguments });
    const text = await callLLM(prompt, req.signal);

    const hint = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();

    return NextResponse.json({ hint });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
