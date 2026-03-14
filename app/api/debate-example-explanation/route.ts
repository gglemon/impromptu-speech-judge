import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";
import { debateExampleExplanationPrompt } from "@/lib/prompts/debate";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const { userArgument, exampleArgument, side, resolution, difficulty } = await req.json();

    const prompt = debateExampleExplanationPrompt({ userArgument, exampleArgument, side, resolution, difficulty });
    const text = await callLLM(prompt, req.signal);

    const explanation = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/^(sure[,!.]?|ok[,!.]?|of course[,!.]?|great[,!.]?|here('s| is)[^.]*[.!])\s*/i, "")
      .trim();

    return NextResponse.json({ explanation });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
