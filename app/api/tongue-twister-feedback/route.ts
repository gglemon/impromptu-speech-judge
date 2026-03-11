import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const { twister, transcript, repetitions } = await req.json();

    const text = await callLLM(
      `You are a fun speech coach helping a student practice tongue twisters.

Target tongue twister: "${twister}"
Times to repeat: ${repetitions}
What the student actually said: "${transcript}"

Compare what the student said to the target. The student should have said it ${repetitions} time(s) in a row.

Score their accuracy (0-10): how closely did the words match? Small pronunciation variations are OK, but missing or garbled words should lower the score.
Score their fluency (0-10): did they sound smooth and clear, or did they stumble a lot?

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{
  "accuracy": <number 0-10 with one decimal>,
  "fluency": <number 0-10 with one decimal>,
  "summary": "<1-2 fun, encouraging sentences about their attempt>",
  "tricky_parts": ["<word or phrase they likely stumbled on>"],
  "tip": "<one specific tip to say it better next time>"
}`,
      req.signal
    );

    const cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim()
      .replace(/```json|```/g, "")
      .trim();

    const sanitized = cleaned.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (_, inner) =>
        `"${inner.replace(/[\x00-\x1F\x7F]/g, (c: string) => {
          const escapes: Record<string, string> = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
          return escapes[c] ?? "";
        })}"`
    );

    const feedback = JSON.parse(sanitized);
    return NextResponse.json(feedback);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
