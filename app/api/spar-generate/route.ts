import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";
import { sparConstructivePrompt } from "@/lib/prompts/spar";

export async function POST(req: NextRequest) {
  try {
    const { resolution, userSide, difficulty = "medium", aiDifficulty = "medium" } = await req.json();
    const aiSideShort = userSide === "aff" ? "neg" : "aff";

    const prompt = sparConstructivePrompt({ resolution, userSide, difficulty, aiDifficulty });
    const text = await callLLM(prompt, req.signal);

    const result = parseLLMJson(text) as Record<string, unknown>;
    return NextResponse.json({ ...result, aiSide: aiSideShort });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
