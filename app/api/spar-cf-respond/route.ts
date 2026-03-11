import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";

export async function POST(req: NextRequest) {
  try {
    const { resolution, aiSide, aiConstructive, question, difficulty = "medium", aiDifficulty = "medium" } = await req.json();
    const aiSideLabel = aiSide === "aff" ? "Affirmative" : "Negative";
    const languageStyle = difficulty === "easy"
      ? "Respond as a 3rd or 4th grade student would speak: simple words, short sentences, concrete everyday examples."
      : difficulty === "medium"
      ? "Respond as a 5th or 6th grade student would speak: clear vocabulary, logical reasoning, relatable examples."
      : "Respond as a middle school or high school student would speak: precise vocabulary, persuasive tone, nuanced reasoning.";

    const text = await callLLM(
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

${aiDifficulty === "easy"
  ? "Give a somewhat weak response (3-5 sentences). Admit some uncertainty on at least one point, partially dodge the question, or leave a logical gap the opponent can exploit."
  : aiDifficulty === "hard"
  ? "Give the sharpest, most direct response possible (3-5 sentences). Fully defend your position, address every part of the question, and if possible turn it back on your opponent."
  : "Give a concise, direct response (3-5 sentences) that defends your position and directly addresses their question."}

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "response": "<your spoken response, 3-5 sentences>" }`
    , req.signal);

    const result = parseLLMJson(text);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
