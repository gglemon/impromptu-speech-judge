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
    const { userArgument, exampleArgument, side, resolution, difficulty } = await req.json();

    const sideLabel = side === "aff" ? "Affirmative (PRO)" : "Negative (CON)";

    const languageGuide = difficulty === "easy"
      ? "Explain like talking to a 3rd or 4th grader: very short sentences, simple everyday words, warm and encouraging tone."
      : difficulty === "hard"
      ? "Explain like talking to a 7th grader or above: precise vocabulary, analytical tone, specific about logic and rhetoric."
      : "Explain like talking to a 5th or 6th grader: clear language, supportive but specific.";

    const text = await callLLM(
      `You are a debate coach explaining to a student why an example argument is stronger than their attempt.

LANGUAGE: ${languageGuide}

Resolution: "${resolution}"
Side: ${sideLabel}

Student's argument:
"${userArgument}"

AI example argument:
"${exampleArgument}"

Compare the two arguments. Explain clearly and specifically:
1. What the student did well (keep it brief, 1 sentence)
2. What makes the AI example stronger — focus on 2-3 concrete differences (better evidence, clearer logic, stronger opening, etc.)
3. One simple thing the student can try next time

Keep the whole explanation under 5 sentences. Be encouraging but honest. Do NOT start with "Sure", "Ok", "Great", or any filler.

OUTPUT RULE: Output ONLY the explanation. No labels, no intro phrase, no "Here is". Start directly.`,
      req.signal
    );

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
