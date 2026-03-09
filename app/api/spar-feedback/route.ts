import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callOllama } from "@/lib/ollama";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }
  try {
    const {
      resolution,
      userSide,
      userName,
      aiConstructive,
      aiRebuttal,
      userConstructive,
      userCrossfire,
      userRebuttal,
    } = await req.json();

    const userSideLabel = userSide === "aff" ? "Affirmative" : "Negative";
    const aiSideLabel = userSide === "aff" ? "Negative" : "Affirmative";

    const text = await callOllama(
      `You are an expert SPAR debate judge evaluating ${userName}'s performance. They argued the ${userSideLabel} side of the following resolution:

Resolution: ${resolution}

THE AI OPPONENT (${aiSideLabel} side) MADE THESE ARGUMENTS:

AI Constructive Speech:
"""
${aiConstructive}
"""

AI Rebuttal Speech:
"""
${aiRebuttal}
"""

${userName}'S SPEECHES TO EVALUATE:

${userName}'s Constructive Speech:
"""
${userConstructive || "(No constructive speech recorded)"}
"""

${userName}'s Crossfire Participation:
"""
${userCrossfire || "(No crossfire recorded)"}
"""

${userName}'s Rebuttal Speech:
"""
${userRebuttal || "(No rebuttal recorded)"}
"""

JUDGING CRITERIA — score each applicable criterion 0–10 for each phase:
- Content: Does the speaker make logical arguments, supported by evidence, that directly address the topic?
- Structure: Is the presentation organized and easy to follow?
- Delivery: Is the speaker clear, persuasive, and engaging?
- Cross-Examination: Does the speaker ask insightful questions and respond effectively? (crossfire only)
- Refutation: Is the speaker effective in defending their case and refuting the opponent? (rebuttal only)

IMPORTANT: If a speech shows "(No constructive speech recorded)", "(No crossfire recorded)", or "(No rebuttal recorded)", treat it as a forfeit — score ALL criteria for that phase as 1.0 and note in the feedback that no speech was delivered.

For the rebuttal, assess whether ${userName} directly engaged with the AI's specific arguments or gave generic responses.

Return ONLY valid JSON in this exact format (no markdown, no code blocks, no thinking tags):
{
  "overall_score": <average of all three phase scores, number 0-10 one decimal>,
  "overall_summary": "<2-3 sentence overall assessment of ${userName}'s debate performance>",
  "constructive": {
    "score": <average of content + structure + delivery, number 0-10 one decimal>,
    "feedback": "<specific feedback on constructive speech>",
    "ratings": {
      "content": <number 0-10 one decimal>,
      "structure": <number 0-10 one decimal>,
      "delivery": <number 0-10 one decimal>
    }
  },
  "crossfire": {
    "score": <average of cross_examination + delivery, number 0-10 one decimal>,
    "feedback": "<specific feedback on crossfire>",
    "ratings": {
      "cross_examination": <number 0-10 one decimal>,
      "delivery": <number 0-10 one decimal>
    }
  },
  "rebuttal": {
    "score": <average of content + refutation + delivery, number 0-10 one decimal>,
    "feedback": "<specific feedback on rebuttal: clash with AI's actual arguments>",
    "ratings": {
      "content": <number 0-10 one decimal>,
      "refutation": <number 0-10 one decimal>,
      "delivery": <number 0-10 one decimal>
    }
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": [
    {
      "aspect": "<Content | Structure | Delivery | Cross-Examination | Refutation>",
      "issue": "<what was lacking>",
      "suggestion": "<specific actionable improvement>"
    }
  ]
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

    const feedback = JSON.parse(sanitized);
    return NextResponse.json(feedback);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
