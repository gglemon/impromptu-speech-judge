import { NextRequest, NextResponse } from "next/server";
import { callOllama } from "@/lib/ollama";

export async function POST(req: NextRequest) {
  try {
    const { resolution, userSide, aiConstructive, userConstructive, userCrossfire, difficulty = "medium" } = await req.json();

    const userSideLabel = userSide === "aff" ? "Affirmative" : "Negative";
    const aiSideLabel = userSide === "aff" ? "Negative" : "Affirmative";
    const voteDirection = userSide === "aff" ? "for" : "against";
    const languageStyle = difficulty === "easy"
      ? "Write as a 3rd or 4th grade student would speak: short sentences, simple everyday words, concrete examples."
      : difficulty === "medium"
      ? "Write as a 5th or 6th grade student would speak: clear sentences, grade-appropriate vocabulary, logical reasoning."
      : "Write as a middle school or high school student would speak: varied sentence structure, sophisticated vocabulary, persuasive arguments.";

    const text = await callOllama(
      `You are a debate coach helping a student write their rebuttal speech. The student argues the ${userSideLabel} side of this resolution.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

THE OPPONENT'S (${aiSideLabel}) CONSTRUCTIVE SPEECH:
"""
${aiConstructive || "(No AI constructive speech available)"}
"""

THE STUDENT'S (${userSideLabel}) CONSTRUCTIVE SPEECH:
"""
${userConstructive || "(No constructive speech was delivered)"}
"""

CROSSFIRE EXCHANGES:
"""
${userCrossfire || "(No crossfire took place)"}
"""

Write a REBUTTAL SPEECH (exactly 200 words) for the student to deliver as the ${userSideLabel} side.
Begin "In my rebuttal...". Directly counter 3 specific arguments the opponent raised. Defend the student's own position. End urging a vote ${voteDirection} the resolution.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "user_rebuttal_hint": "<exactly 200 word rebuttal speech>"
}`
    , req.signal);

    const cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim()
      .replace(/```json|```/g, "")
      .trim();

    const sanitized = cleaned.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (_, inner) => `"${inner.replace(/[\x00-\x1F\x7F]/g, (c: string) => {
        const escapes: Record<string, string> = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
        return escapes[c] ?? "";
      })}"`
    );

    const result = JSON.parse(sanitized);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
