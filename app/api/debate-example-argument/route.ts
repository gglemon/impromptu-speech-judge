import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callOllama } from "@/lib/ollama";

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

    const sideLabel = side === "aff" ? "Affirmative (PRO)" : "Negative (CON)";
    const position = side === "aff" ? "support" : "oppose";

    const languageGuide = difficulty === "easy"
      ? "Write like a confident 3rd or 4th grader: very short sentences, simple everyday words, one concrete example from school or home. Sound enthusiastic, like a kid talking to classmates."
      : difficulty === "hard"
      ? "Write like a confident 7th grader or above: varied sentences, precise vocabulary, well-developed reasoning, persuasive rhetoric."
      : "Write like a confident 5th or 6th grader: clear sentences, logical reasoning, a specific relatable example.";

    const improvementContext =
      improvements?.length > 0
        ? `\nThe student's argument had these areas to improve:\n${improvements.map((s: string) => `- ${s}`).join("\n")}\nMake sure the example argument addresses these weaknesses.`
        : "";

    const text = await callOllama(
      `You are a debate coach. Write a short example argument for a student to learn from.

Resolution: "${resolution}"
Side: ${sideLabel} (must ${position} the resolution)
Round: ${round} of 3

Student's attempt:
"${userTranscript}"
${improvementContext}
Build directly on the student's ideas. Keep any good points they made, but make them clearer and stronger.

LANGUAGE: ${languageGuide}

LENGTH: 3-5 sentences only.

OUTPUT RULE: Output ONLY the argument itself. No intro, no label, no explanation, no "Here is", no "Sure", no "Ok". Start directly with the argument.`,
      req.signal
    );

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
