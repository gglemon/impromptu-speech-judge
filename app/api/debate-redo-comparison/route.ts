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
    const { resolution, side, originalTranscript, originalFeedback, redoTranscript, redoFeedback, difficulty } =
      await req.json();

    const sideLabel = side === "aff" ? "Affirmative (PRO)" : "Negative (CON)";

    const languageGuide =
      difficulty === "easy"
        ? "Use simple words a 3rd or 4th grader would understand. Keep it friendly and encouraging."
        : "Use clear language a 5th or 6th grader would understand. Be specific and encouraging.";

    const text = await callLLM(
      `You are a debate coach comparing a student's original argument to their redo attempt.

Resolution: "${resolution}"
Side: ${sideLabel}

ORIGINAL ARGUMENT (score: ${originalFeedback.score}/10):
"${originalTranscript}"

REDO ARGUMENT (score: ${redoFeedback.score}/10):
"${redoTranscript}"

Compare these two arguments. Identify:
1. Key sentences or phrases from the REDO that are clearly stronger or show improvement
2. Any parts of the ORIGINAL that were actually better (if any)
3. One overall encouraging verdict about their progress

${languageGuide}

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{
  "key_improvements": ["<exact quote or paraphrase from redo that improved, with brief explanation>", ...],
  "regressions": ["<anything from original that was lost or worse in redo, if any — empty array if none>"],
  "verdict": "<1-2 encouraging sentences about their overall progress>"
}`,
      req.signal
    );

    return NextResponse.json(parseLLMJson(text));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
