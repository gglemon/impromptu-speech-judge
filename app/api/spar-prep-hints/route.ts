import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const { resolution, userSide, difficulty = "medium" } = await req.json();
    const sideLabel = userSide === "aff" ? "Affirmative" : "Negative";
    const voteDir = userSide === "aff" ? "for" : "against";
    const languageStyle = difficulty === "easy"
      ? "Use language a 3rd or 4th grade student would understand: simple words, short sentences, concrete everyday examples."
      : difficulty === "medium"
      ? "Use language a 5th or 6th grade student would understand: clear vocabulary, logical reasoning, relatable examples."
      : "Use language a middle school or high school student would understand: precise vocabulary, nuanced reasoning, academic examples.";

    const text = await callLLM(
      `You are a debate coach. The student argues the ${sideLabel} side (vote ${voteDir}) of:

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

Return a prep sheet as ONLY valid JSON (no markdown, no code blocks):
{
  "value": "<1-2 word value>",
  "criterion": "<criterion — 1 sentence why>",
  "arguments": [
    { "claim": "<1 sentence>", "talkingPoints": ["<1 sentence>", "<1 sentence>"], "significance": "<1 sentence>" },
    { "claim": "<1 sentence>", "talkingPoints": ["<1 sentence>", "<1 sentence>"], "significance": "<1 sentence>" },
    { "claim": "<1 sentence>", "talkingPoints": ["<1 sentence>", "<1 sentence>"], "significance": "<1 sentence>" }
  ],
  "counters": [
    { "theyArgue": "<1 sentence>", "yourRebuttal": "<1 sentence>" },
    { "theyArgue": "<1 sentence>", "yourRebuttal": "<1 sentence>" }
  ]
}`
    , req.signal);

    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim().replace(/```json|```/g, "").trim();
    const sanitized = cleaned.replace(/"((?:[^"\\]|\\.)*)"/g, (_, inner) =>
      `"${inner.replace(/[\x00-\x1F\x7F]/g, (c: string) => ({ "\n": "\\n", "\r": "\\r", "\t": "\\t" } as Record<string, string>)[c] ?? "")}"`
    );
    const result = JSON.parse(sanitized);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
