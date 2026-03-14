import Link from "next/link";
import type { ArgumentResult } from "./types";

export interface DebateCompleteProps {
  topic: string;
  results: ArgumentResult[];
  avgScore: string | null;
  userEmail: string;
  emailSent: boolean;
  emailError: string;
}

export function DebateComplete({
  topic,
  results,
  avgScore,
  userEmail,
  emailSent,
  emailError,
}: DebateCompleteProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-bold">Practice Complete!</h2>
          <p className="text-gray-400">
            Average score:{" "}
            <span className="text-white font-bold text-xl">{avgScore}/10</span>
          </p>
        </div>

        <div className="rounded-2xl border border-purple-700 bg-purple-950 p-4">
          <p className="text-xs text-purple-400 mb-1">Resolution</p>
          <p className="text-white font-medium">&ldquo;{topic}&rdquo;</p>
        </div>

        <div className="space-y-4">
          {results.map((r, i) => {
            const isAff = r.side === "aff";
            const borderColor = isAff ? "border-purple-800" : "border-orange-800";
            const labelColor = isAff ? "text-purple-400" : "text-orange-400";
            const scoreColor =
              r.score >= 8
                ? "text-green-400"
                : r.score >= 6
                ? "text-yellow-400"
                : "text-red-400";
            return (
              <div
                key={i}
                className={`rounded-xl border ${borderColor} bg-gray-900 p-5 space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>
                    Round {r.round} — {isAff ? "Affirmative" : "Negative"}
                  </p>
                  <span className={`text-2xl font-bold ${scoreColor}`}>
                    {r.score}
                    <span className="text-sm text-gray-500">/10</span>
                  </span>
                </div>
                <p className="text-gray-400 text-sm italic">&ldquo;{r.transcript}&rdquo;</p>
                <p className="text-gray-300 text-sm">{r.summary}</p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">
                      Strengths
                    </p>
                    {r.strengths.map((s, j) => (
                      <p key={j} className="text-xs text-green-200">
                        • {s}
                      </p>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">
                      Improve
                    </p>
                    {r.improvements.map((s, j) => (
                      <p key={j} className="text-xs text-amber-200">
                        • {s}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-800">
                  <span>Relevance: {r.criterion_scores.relevance}</span>
                  <span>Reasoning: {r.criterion_scores.reasoning}</span>
                  <span>Clarity: {r.criterion_scores.clarity}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Email summary */}
        {emailSent ? (
          <p className="text-green-400 text-sm text-center">
            Summary sent to {userEmail} ✓
          </p>
        ) : emailError ? (
          <p className="text-red-400 text-xs text-center">{emailError}</p>
        ) : (
          <p className="text-gray-500 text-xs text-center">Sending summary...</p>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
          >
            New Topic
          </button>
          <Link
            href="/"
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors text-center"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
