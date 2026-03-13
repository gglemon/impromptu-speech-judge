import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";

function getLanguageStyle(difficulty: string): string {
  if (difficulty === "easy") return "Write as a 3rd or 4th grade student would speak: use short sentences, simple everyday words, and concrete real-life examples. Avoid complex vocabulary or abstract reasoning.";
  if (difficulty === "medium") return "Write as a 5th or 6th grade student would speak: use clear sentences, grade-appropriate vocabulary, and logical reasoning with relatable examples.";
  return "Write as a middle school or high school student would speak: use varied sentence structure, sophisticated vocabulary, well-developed arguments, and persuasive rhetoric.";
}

export async function POST(req: NextRequest) {
  try {
    const { resolution, userSide, difficulty = "medium", aiDifficulty = "medium" } = await req.json();
    const aiSide = userSide === "aff" ? "Negative" : "Affirmative";
    const aiSideShort = userSide === "aff" ? "neg" : "aff";
    const voteDirection = aiSide === "Affirmative" ? "for" : "against";
    const languageStyle = getLanguageStyle(difficulty);

    let prompt: string;

    if (aiDifficulty === "easy") {
      prompt = `You are roleplaying a 3rd-grade student who is brand new to speech and debate. You barely understand what a "resolution" is.

Resolution: ${resolution}

Write a short, weak constructive speech of about 60–80 words arguing the ${aiSide} side. You must:
- Sound like a nervous, inexperienced 3rd grader who doesn't know debate rules
- Give only 1 vague point with no real evidence — just a personal feeling or simple example
- Ramble or repeat yourself a little
- NOT use debate structure (no "criterion", no numbered arguments, no "in conclusion")
- Use very simple words and short sentences
- Start with "Um, hi. My name is Alex and I think..." or similar awkward opener

Return ONLY valid JSON (no markdown, no code blocks):
{ "ai_constructive": "<60-80 word weak speech>" }`;
    } else {
      const aiStrengthGuide = aiDifficulty === "hard"
        ? "IMPORTANT: Make the strongest possible argument. Use airtight logic, anticipate counterarguments, and leave no obvious weaknesses."
        : "";

      prompt = `You are a competitive debater arguing the ${aiSide} side of this resolution.

LANGUAGE STYLE: ${languageStyle}
${aiStrengthGuide ? `\n${aiStrengthGuide}\n` : ""}

Resolution: ${resolution}

Generate ONE speech, exactly 300 words.

CONSTRUCTIVE SPEECH (300 words): Begin "Hello, my name is AI Debate Agent, and I stand in ${aiSide === "Affirmative" ? "affirmation" : "negation"} of this resolution." State a clear criterion (2-3 sentences). Present three arguments — for each: state the claim, give 3-4 sentences of evidence and reasoning, explain the significance. End with a conclusion urging a vote ${voteDirection} the resolution.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "ai_constructive": "<exactly 300 word constructive speech>"
}`;
    }

    const text = await callLLM(prompt, req.signal);

    const result = parseLLMJson(text);
    return NextResponse.json({ ...result, aiSide: aiSideShort });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
