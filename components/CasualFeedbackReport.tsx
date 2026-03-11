"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AudioPlayer from "@/components/AudioPlayer";

interface CasualFeedback {
  score: number;
  emoji: string;
  summary: string;
  highlights: string[];
  tip: string;
  length_note?: string;
  ai_example?: string;
}

interface Props {
  feedback: CasualFeedback;
  topic: string;
  transcript: string;
  audioUrl?: string;
  onRedo?: () => void;
}

export default function CasualFeedbackReport({ feedback, topic, transcript, audioUrl, onRedo }: Props) {
  const router = useRouter();
  const [explanation, setExplanation] = useState("");
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const [explanationFetched, setExplanationFetched] = useState(false);

  useEffect(() => {
    const body = [
      `Free Talk Summary`,
      `Topic: "${topic}"`,
      `Score: ${feedback.score}/10`,
      ``,
      `Student's Speech:`,
      transcript,
      ``,
      `Feedback:`,
      feedback.summary,
      ``,
      `Highlights: ${feedback.highlights.join("; ")}`,
      `Tip: ${feedback.tip}`,
      feedback.length_note ? `Length: ${feedback.length_note}` : "",
    ].filter(l => l !== undefined).join("\n");

    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "gglemon@gmail.com",
        subject: `Free Talk: "${topic}"`,
        text: body,
      }),
    }).catch(() => {/* silent */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchExplanation() {
    if (explanationFetched || !feedback.ai_example) return;
    setExplanationFetched(true);
    setExplanationLoading(true);
    setExplanationError("");
    try {
      const res = await fetch("/api/casual-example-explanation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          userTranscript: transcript,
          aiExample: feedback.ai_example,
          speechLength: 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setExplanation(data.explanation ?? "");
    } catch (e: unknown) {
      setExplanationError(e instanceof Error ? e.message : "Could not generate explanation");
    } finally {
      setExplanationLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Top box: topic, score */}
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-950 border border-emerald-700 p-8">
        <div className="text-center w-full">
          <p className="text-xs uppercase tracking-wide text-emerald-600 mb-1">Your Topic</p>
          <p className="text-white font-medium text-lg">{topic}</p>
        </div>
        <div className="border-t border-emerald-800 pt-3 w-full flex flex-col items-center gap-1">
          <span className="text-7xl">{feedback.emoji}</span>
          <div className="text-6xl font-bold text-emerald-400">{feedback.score}</div>
          <div className="text-emerald-300 text-sm font-medium">out of 10</div>
        </div>
      </div>

      {/* Summary + Highlights + Tip + Length combined */}
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">What We Thought</h2>
          <p className="text-gray-300 leading-relaxed">{feedback.summary}</p>
        </div>
        <div className="border-t border-gray-700 pt-4">
          <h2 className="text-lg font-semibold text-white mb-3">Great Job! ✅</h2>
          <ul className="space-y-2">
            {feedback.highlights.map((highlight, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-300">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-gray-700 pt-4">
          <h2 className="text-lg font-semibold text-amber-300 mb-2">💡 Try This Next Time</h2>
          <p className="text-amber-100">{feedback.tip}</p>
        </div>
        {feedback.length_note && (
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-1">⏱ Speech Length</p>
            <p className="text-blue-200 text-sm">{feedback.length_note}</p>
          </div>
        )}
      </div>

      {/* AI example speech + explanation */}
      {feedback.ai_example && (
        <details
          className="rounded-xl bg-gray-800 border border-emerald-700 p-5 group"
          onToggle={e => { if ((e.target as HTMLDetailsElement).open) fetchExplanation(); }}
        >
          <summary className="cursor-pointer text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            ✨ See an AI Example Speech (tap to read)
          </summary>
          <div className="mt-4 space-y-4">
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{feedback.ai_example}</p>

            {/* Improvement explanation */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
              <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide">💡 What improved</p>
              {explanationLoading && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-yellow-400 text-xs">Analyzing improvements...</p>
                </div>
              )}
              {explanationError && <p className="text-red-400 text-xs">{explanationError}</p>}
              {explanation && !explanationLoading && (
                <div className="text-yellow-100 text-sm leading-relaxed space-y-1">
                  {explanation.split("\n").map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    const isBullet = /^[-•*]/.test(trimmed);
                    return isBullet ? (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                        <span>{trimmed.replace(/^[-•*]\s*/, "")}</span>
                      </div>
                    ) : (
                      <p key={i}>{trimmed}</p>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </details>
      )}

      {/* Transcript + replay (collapsible) */}
      <details className="rounded-xl bg-gray-800 border border-gray-700 p-5">
        <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-white transition-colors">
          Your Speech (tap to read)
        </summary>
        <div className="mt-3 space-y-3">
          {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
        </div>
      </details>

      {/* Buttons */}
      <div className="flex gap-3">
        {onRedo && (
          <button
            onClick={onRedo}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
          >
            ↩ Try Again
          </button>
        )}
        <button
          onClick={() => router.push("/casual")}
          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
        >
          New Topic
        </button>
        <Link
          href="/"
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold text-center rounded-xl transition-colors"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
