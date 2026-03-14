import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";
import { debateExampleArgumentPrompt } from "@/lib/prompts/debate";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const { resolution, side, round, difficulty, userTranscript, improvements } = await req.json();

    const prompt = debateExampleArgumentPrompt({ resolution, side, round, difficulty, userTranscript, improvements });
    const text = await callLLM(prompt, req.signal);

    const argument = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/^(sure[,!.]?|ok[,!.]?|of course[,!.]?|here('s| is)[^.]*[.!]|let me[^.]*[.!]|i('ll| will)[^.]*[.!])\s*/i, "")
      .trim();

    return NextResponse.json({ argument });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
