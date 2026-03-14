import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";
import { sparCrossfirePrompt } from "@/lib/prompts/spar";

export async function POST(req: NextRequest) {
  try {
    const { resolution, aiSide, aiConstructive, userConstructive, difficulty = "medium", aiDifficulty = "medium" } = await req.json();

    const prompt = sparCrossfirePrompt({ resolution, aiSide, aiConstructive, userConstructive, difficulty, aiDifficulty });
    const text = await callLLM(prompt, req.signal);

    const result = parseLLMJson(text);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
