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

    const languageGuide =
      difficulty === "easy"
        ? "Write like a confident 3rd or 4th grader. Use short sentences, simple words, and fun everyday examples from school, home, or friends. Keep it clear and easy to follow."
        : "Write like a confident 5th or 6th grader. Use clear reasoning, give a specific example or two, and keep it well-organized but easy to understand.";

    const improvementContext =
      improvements?.length > 0
        ? `\nThe student's argument had these areas to improve:\n${improvements.map((s: string) => `- ${s}`).join("\n")}\nMake sure the example argument addresses these weaknesses.`
        : "";

    const text = await callOllama(
      `You are a debate coach writing a strong example argument for a student to learn from.

Resolution: "${resolution}"
Side: ${sideLabel} (must ${position} the resolution)
Round: ${round} of 3

Student's attempt:
"${userTranscript}"
${improvementContext}

Write ONE strong example argument for the ${sideLabel} side. Build directly on the student's ideas — keep any good points they made, but make them clearer, stronger, and better supported. This is a model argument the student can study and learn from.

${languageGuide}

Keep it to 3-5 sentences. Write it as a natural spoken argument, not a list. Do not include any preamble, labels, or explanations — just the argument itself.`,
      req.signal
    );

    const argument = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();

    return NextResponse.json({ argument });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
