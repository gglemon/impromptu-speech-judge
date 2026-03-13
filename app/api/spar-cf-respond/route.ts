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
  ? `You are roleplaying a nervous 3rd-grade student who is new to debate. Give a weak, uncertain response in 2-3 short sentences. You must:
- Sound confused or unsure, like a kid who doesn't fully understand what they're being asked
- Partially dodge the question or miss the point
- Use very simple words, possibly repeat yourself a little
- Maybe say something like "I mean... I think so?" or "Um, because it's just better that way"
- Do NOT give a clear logical defense`
  : aiDifficulty === "hard"
  ? "Give the sharpest, most direct response possible (3-5 sentences). Fully defend your position, address every part of the question, and if possible turn it back on your opponent."
  : "Give a concise, direct response (3-5 sentences) that defends your position and directly addresses their question."}

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "response": "<your spoken response>" }`
    , req.signal);

    const result = parseLLMJson(text);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
