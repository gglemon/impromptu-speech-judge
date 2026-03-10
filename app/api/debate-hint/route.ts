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
    const { resolution, side, round, difficulty, previousArguments } = await req.json();

    const sideLabel = side === "aff" ? "FOR" : "AGAINST";
    const position = side === "aff" ? "affirmative (pro)" : "negative (con)";

    const languageGuide =
      difficulty === "easy"
        ? `Write like you are talking to a 3rd or 4th grader. Use simple, short words. Give everyday examples from school, home, pets, or friends. Keep it fun and easy to understand. Avoid big or complicated words.`
        : `Write like you are talking to a 5th or 6th grader. Use clear language with some reasoning. Give examples from school subjects, news, or things they might know about. You can use slightly more complex ideas but keep it easy to follow.`;

    const previousContext =
      previousArguments?.length > 0
        ? `\nArguments already made in this debate (do NOT repeat these ideas):\n${previousArguments
            .map(
              (a: { side: string; round: number; transcript: string }) =>
                `- ${a.side === "aff" ? "AFF" : "NEG"} Round ${a.round}: "${a.transcript}"`
            )
            .join("\n")}`
        : "";

    const text = await callOllama(
      `You are a friendly debate coach helping a student come up with an argument.

Resolution: "${resolution}"
The student must argue ${sideLabel} the resolution (${position} side).
This is Round ${round} of 3.${previousContext}

Give the student ONE short, helpful hint or idea for a NEW argument they could make. The hint should spark their thinking — not write the argument for them.

${languageGuide}

Keep the hint to 2-4 sentences. Do NOT use bullet points or headers. Just write naturally like a coach talking to a kid. Do not start with "Sure" or "Of course" or similar filler phrases.`,
      req.signal
    );

    const hint = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();

    return NextResponse.json({ hint });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
