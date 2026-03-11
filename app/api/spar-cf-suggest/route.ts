import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const { resolution, userSide, aiSide, aiConstructive, mode, aiQuestion, difficulty = "medium" } = await req.json();
    const userSideLabel = userSide === "aff" ? "Affirmative" : "Negative";
    const aiSideLabel = aiSide === "aff" ? "Affirmative" : "Negative";
    const languageStyle = difficulty === "easy"
      ? "Use language a 3rd or 4th grade student would say: simple words, short sentences, everyday examples."
      : difficulty === "medium"
      ? "Use language a 5th or 6th grade student would say: clear vocabulary, logical reasoning, relatable examples."
      : "Use language a middle school or high school student would say: varied vocabulary, persuasive tone, nuanced reasoning.";

    let prompt: string;

    if (mode === "question") {
      prompt = `You are coaching a competitive debater who is arguing the ${userSideLabel} side in a SPAR debate.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

The opposing ${aiSideLabel} debater gave this constructive speech:
"""
${aiConstructive}
"""

Generate 3 sharp crossfire questions the ${userSideLabel} debater could ask to challenge the opponent's arguments. Each question should:
- Target a specific claim or assumption from the opponent's speech
- Be concise (1-2 sentences)
- Be genuinely challenging (expose a weakness or force a concession)

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "suggestions": ["<question 1>", "<question 2>", "<question 3>"] }`;
    } else {
      prompt = `You are coaching a competitive debater who is arguing the ${userSideLabel} side in a SPAR debate.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

The opposing ${aiSideLabel} debater gave this constructive speech:
"""
${aiConstructive}
"""

The ${aiSideLabel} debater just asked this crossfire question:
"""
${aiQuestion}
"""

Generate 3 possible responses the ${userSideLabel} debater could give. Each response should:
- Directly address the question without conceding the core point
- Be 2-4 sentences
- Defend the ${userSideLabel} position effectively

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "suggestions": ["<response 1>", "<response 2>", "<response 3>"] }`;
    }

    const text = await callLLM(prompt, req.signal);
    const result = parseLLMJson(text);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
