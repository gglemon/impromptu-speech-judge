import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";
import { sparPrepHintsPrompt } from "@/lib/prompts/spar";

export async function POST(req: NextRequest) {
  try {
    const { resolution, userSide, difficulty = "medium" } = await req.json();

    const prompt = sparPrepHintsPrompt({ resolution, userSide, difficulty });
    const text = await callLLM(prompt, req.signal);

    console.log("[spar-prep-hints] raw LLM output:", text.slice(0, 500));
    const result = parseLLMJson(text);
    console.log("[spar-prep-hints] parsed:", JSON.stringify(result).slice(0, 200));
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[spar-prep-hints] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
