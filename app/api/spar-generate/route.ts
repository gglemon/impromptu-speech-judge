import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";

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
    const aiStrengthGuide = aiDifficulty === "easy"
      ? "IMPORTANT: Deliberately make a somewhat weak argument. Leave at least one obvious logical gap or unsupported claim the opponent can exploit. Use vague or unconvincing reasoning for at least one of your three arguments. Make it beatable but not absurd."
      : aiDifficulty === "hard"
      ? "IMPORTANT: Make the strongest possible argument. Use airtight logic, anticipate counterarguments, and leave no obvious weaknesses."
      : "";

    const text = await callLLM(
      `You are a competitive debater arguing the ${aiSide} side of this resolution.

LANGUAGE STYLE: ${languageStyle}
${aiStrengthGuide ? `\n${aiStrengthGuide}\n` : ""}

Resolution: ${resolution}

Generate ONE speech, exactly 300 words.

CONSTRUCTIVE SPEECH (300 words): Begin "Hello, my name is AI Debate Agent, and I stand in ${aiSide === "Affirmative" ? "affirmation" : "negation"} of this resolution." State a clear criterion (2-3 sentences). Present three arguments — for each: state the claim, give 3-4 sentences of evidence and reasoning, explain the significance. End with a conclusion urging a vote ${voteDirection} the resolution.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "ai_constructive": "<exactly 300 word constructive speech>"
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
    return NextResponse.json({ ...result, aiSide: aiSideShort });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
