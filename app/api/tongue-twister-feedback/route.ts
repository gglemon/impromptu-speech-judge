import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const { twister, transcript } = await req.json();

    const text = await callLLM(
      `You are a speech coach grading a tongue twister attempt. Reply ONLY with valid JSON, no other text.

Tongue twister: "${twister}"
Student said: "${transcript}"

Score accuracy (0-10): how closely did the words match? Small pronunciation variations are OK.
Score fluency (0-10): how smooth and clear was the delivery?

{"accuracy":<0-10.0>,"fluency":<0-10.0>,"summary":"<1-2 encouraging sentences>","tricky_parts":["<word/phrase>"],"tip":"<one tip>"}`,
      req.signal
    );

    const feedback = parseLLMJson(text);
    return NextResponse.json(feedback);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
