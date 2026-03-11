import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const { resolution, aiSide, aiConstructive, userConstructive, difficulty = "medium", aiDifficulty = "medium" } = await req.json();
    const languageStyle = difficulty === "easy"
      ? "Use language a 3rd or 4th grade student would understand: simple words, short direct questions, concrete examples."
      : difficulty === "medium"
      ? "Use language a 5th or 6th grade student would understand: clear vocabulary, focused questions, logical reasoning."
      : "Use language a middle school or high school student would understand: precise vocabulary, pointed analytical questions.";

    const text = await callLLM(
      `You are a skilled debater preparing crossfire questions for a SPAR debate.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}
Your side: ${aiSide === "aff" ? "Affirmative" : "Negative"}

Your own constructive speech (what you argued):
"""
${aiConstructive || "(Not provided)"}
"""

Your opponent just delivered this constructive speech:
"""
${userConstructive || "(No speech recorded)"}
"""

${aiDifficulty === "easy"
  ? "Generate 3 crossfire questions. At least one should be easy to deflect or based on a weak assumption. Don't always target the strongest points. Leave some room for the opponent to recover."
  : aiDifficulty === "hard"
  ? "Generate 3 sharp, incisive crossfire questions that directly target the weakest points in their argument. Make them difficult to dodge."
  : "Generate 3 targeted crossfire questions that directly challenge the specific arguments, evidence, or claims your opponent made."} Each question should:
- Reference something the opponent actually said (or note if they gave no speech)
- Expose a weakness, contradiction, or missing evidence in their argument
- Optionally connect back to one of your own constructive arguments
- Be answerable in 1-2 sentences (not open-ended essays)

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{
  "crossfire_questions": [
    "<pointed question targeting a specific claim from the speech>",
    "<pointed question targeting another claim or piece of evidence>",
    "<pointed question exposing a gap or weakness in their reasoning>"
  ]
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
