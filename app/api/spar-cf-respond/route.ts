import { NextRequest, NextResponse } from "next/server";
import { callOllama } from "@/lib/ollama";

export async function POST(req: NextRequest) {
  try {
    const { resolution, aiSide, aiConstructive, question, difficulty = "medium" } = await req.json();
    const aiSideLabel = aiSide === "aff" ? "Affirmative" : "Negative";
    const languageStyle = difficulty === "easy"
      ? "Respond as a 3rd or 4th grade student would speak: simple words, short sentences, concrete everyday examples."
      : difficulty === "medium"
      ? "Respond as a 5th or 6th grade student would speak: clear vocabulary, logical reasoning, relatable examples."
      : "Respond as a middle school or high school student would speak: precise vocabulary, persuasive tone, nuanced reasoning.";

    const text = await callOllama(
      `You are a competitive debater arguing the ${aiSideLabel} side in a SPAR debate.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

Your constructive speech was:
"""
${aiConstructive}
"""

Your opponent just asked you this crossfire question:
"""
${question}
"""

Give a concise, direct response (3-5 sentences) that:
- Defends your position
- Directly addresses their question
- Exposes a weakness in their implied assumption if possible

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "response": "<your spoken response, 3-5 sentences>" }`
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
