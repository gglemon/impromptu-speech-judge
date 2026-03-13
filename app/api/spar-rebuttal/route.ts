import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";

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
  ? `You are roleplaying a nervous 3rd-grade student who is brand new to debate and doesn't really know what a rebuttal is supposed to do. Write a weak rebuttal of about 60–80 words. You must:
- Sound like a young kid who is just repeating their earlier point without really addressing what the opponent said
- Miss most of what the opponent argued
- Maybe accidentally agree with the opponent on something small
- Use very simple words and short sentences
- Possibly trail off or say something off-topic at the end
- Do NOT start with "In my rebuttal" — start with something like "Um, so I still think..." or "Yeah but..."
- Do NOT use debate structure or list numbered points`
  : aiDifficulty === "hard"
  ? `Write a strong REBUTTAL SPEECH (exactly 300 words) that directly responds to ALL of your opponent's key arguments. Leave no major point unaddressed.`
  : `Write a REBUTTAL SPEECH (exactly 300 words) that directly responds to your opponent's actual arguments above.`}
${aiDifficulty !== "easy" ? `Begin "In my rebuttal...". Address 3 specific points your opponent raised (or note if they failed to make arguments). Defend your own constructive arguments. End urging a vote ${voteDirection} the resolution.` : ""}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "ai_rebuttal": "${aiDifficulty === "easy" ? "<60-80 word weak rebuttal>" : "<exactly 300 word rebuttal speech>"}"
}`
    , req.signal);

    const result = parseLLMJson(text);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
