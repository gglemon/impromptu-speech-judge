import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const { resolution, aiSide, aiConstructive, userConstructive, userCrossfire, difficulty = "medium", aiDifficulty = "medium" } = await req.json();

    const aiSideLabel = aiSide === "aff" ? "Affirmative" : "Negative";
    const userSideLabel = aiSide === "aff" ? "Negative" : "Affirmative";
    const voteDirection = aiSide === "aff" ? "for" : "against";
    const languageStyle = difficulty === "easy"
      ? "Write as a 3rd or 4th grade student would speak: short sentences, simple everyday words, concrete examples."
      : difficulty === "medium"
      ? "Write as a 5th or 6th grade student would speak: clear sentences, grade-appropriate vocabulary, logical reasoning."
      : "Write as a middle school or high school student would speak: varied sentence structure, sophisticated vocabulary, persuasive arguments.";

    const text = await callLLM(
      `You are a competitive debater arguing the ${aiSideLabel} side of this resolution.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

YOUR CONSTRUCTIVE SPEECH (already delivered):
"""
${aiConstructive}
"""

YOUR OPPONENT'S (${userSideLabel}) CONSTRUCTIVE SPEECH:
"""
${userConstructive || "(No constructive speech was delivered)"}
"""

CROSSFIRE EXCHANGES:
"""
${userCrossfire || "(No crossfire took place)"}
"""

${aiDifficulty === "easy"
  ? `Write a REBUTTAL SPEECH (exactly 300 words) that is somewhat weak. Miss at least one key point your opponent made. Make at least one logical error or weak comparison. Leave the rebuttal beatable.`
  : aiDifficulty === "hard"
  ? `Write a strong REBUTTAL SPEECH (exactly 300 words) that directly responds to ALL of your opponent's key arguments. Leave no major point unaddressed.`
  : `Write a REBUTTAL SPEECH (exactly 300 words) that directly responds to your opponent's actual arguments above.`}
Begin "In my rebuttal...". Address 3 specific points your opponent raised (or note if they failed to make arguments). Defend your own constructive arguments. End urging a vote ${voteDirection} the resolution.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "ai_rebuttal": "<exactly 300 word rebuttal speech>"
}`
    , req.signal);

    const result = parseLLMJson(text);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
