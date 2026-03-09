"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AudioPlayer from "@/components/AudioPlayer";

interface CasualFeedback {
  score: number;
  emoji: string;
  summary: string;
  highlights: string[];
  tip: string;
}

interface Props {
  feedback: CasualFeedback;
  topic: string;
  transcript: string;
  audioUrl?: string;
}

export default function CasualFeedbackReport({ feedback, topic, transcript, audioUrl }: Props) {
  const router = useRouter();

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Score + emoji */}
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-950 border border-emerald-700 p-8">
        <span className="text-7xl">{feedback.emoji}</span>
        <div className="text-6xl font-bold text-emerald-400">{feedback.score}</div>
        <div className="text-emerald-300 text-sm font-medium">out of 10</div>
      </div>

      {/* Replay */}
      {audioUrl && <AudioPlayer audioUrl={audioUrl} />}

      {/* Topic */}
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Your Topic</p>
        <p className="text-white font-medium">{topic}</p>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-white mb-2">What We Thought</h2>
        <p className="text-gray-300 leading-relaxed">{feedback.summary}</p>
      </div>

      {/* Highlights */}
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-5">
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

      {/* Tip */}
      <div className="rounded-xl bg-amber-950 border border-amber-600 p-5">
        <h2 className="text-lg font-semibold text-amber-300 mb-2">💡 Try This Next Time</h2>
        <p className="text-amber-100">{feedback.tip}</p>
      </div>

      {/* Transcript (collapsible) */}
      <details className="rounded-xl bg-gray-800 border border-gray-700 p-5">
        <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-white transition-colors">
          Your Speech (tap to read)
        </summary>
        <p className="mt-3 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
      </details>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push("/casual")}
          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
        >
          Try Another Topic
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
