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
    const { resolution, side, argument, round, previousArguments } = await req.json();

    const sideLabel = side === "aff" ? "Affirmative (PRO)" : "Negative (CON)";
    const position = side === "aff" ? "support" : "oppose";

    const previousContext =
      previousArguments?.length > 0
        ? `\nPrevious arguments in this debate:\n${previousArguments
            .map(
              (a: { side: string; round: number; transcript: string }) =>
                `- ${a.side === "aff" ? "AFF" : "NEG"} Round ${a.round}: "${a.transcript}"`
            )
            .join("\n")}`
        : "";

    const text = await callOllama(
      `You are an expert debate coach rating a student's argument in a practice debate.

Resolution: "${resolution}"
Student's side: ${sideLabel} (they must ${position} the resolution)
Round: ${round} of 2${previousContext}

Student's argument:
"""
${argument}
"""

Rate this argument as a debate coach. Consider:
1. RELEVANCE (0-10): Does the argument directly support their assigned side of the resolution?
2. REASONING (0-10): Is the logic sound? Are claims backed with reasoning or examples?
3. CLARITY (0-10): Is the argument clear, organized, and easy to follow?

Weighted overall score: Relevance 40%, Reasoning 40%, Clarity 20%.

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{
  "score": <overall weighted score, number 0-10 with one decimal>,
  "summary": "<2-3 sentence assessment of the argument>",
  "criterion_scores": {
    "relevance": <number 0-10 with one decimal>,
    "reasoning": <number 0-10 with one decimal>,
    "clarity": <number 0-10 with one decimal>
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"]
}`,
      req.signal
    );

    const cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim()
      .replace(/```json|```/g, "")
      .trim();

    const sanitized = cleaned.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (_, inner) =>
        `"${inner.replace(/[\x00-\x1F\x7F]/g, (c: string) => {
          const escapes: Record<string, string> = {
            "\n": "\\n",
            "\r": "\\r",
            "\t": "\\t",
          };
          return escapes[c] ?? "";
        })}"`
    );

    const feedback = JSON.parse(sanitized);
    return NextResponse.json(feedback);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
