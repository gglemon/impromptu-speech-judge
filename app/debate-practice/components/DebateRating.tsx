import { ScoreBadge, TurnIndicator } from "./SharedUI";
import type { ArgumentFeedback } from "./types";

export interface DebateRatingProps {
  currentTurn: { side: "aff" | "neg"; round: number };
  turnIndex: number;
  activeTurns: Array<{ side: "aff" | "neg"; round: number }>;
  isLastTurn: boolean;
  currentTranscript: string;
  currentFeedback: ArgumentFeedback | null;
  isLoading: boolean;
  error: string;
  exampleArgument: string;
  exampleLoading: boolean;
  exampleError: string;
  exampleExplanation: string;
  exampleExplanationLoading: boolean;
  exampleExplanationError: string;
  onFetchExampleArgument: (feedback: ArgumentFeedback, transcript: string) => void;
  onRedo: () => void;
  onNext: () => void;
}

export function DebateRating({
  currentTurn,
  turnIndex,
  activeTurns,
  isLastTurn,
  currentTranscript,
  currentFeedback,
  isLoading,
  error,
  exampleArgument,
  exampleLoading,
  exampleError,
  exampleExplanation,
  exampleExplanationLoading,
  exampleExplanationError,
  onFetchExampleArgument,
  onRedo,
  onNext,
}: DebateRatingProps) {
  const isAff = currentTurn.side === "aff";
  const sideLabel = isAff ? "AFFIRMATIVE" : "NEGATIVE";
  const labelColor = isAff ? "text-purple-400" : "text-orange-400";
  const nextTurn = !isLastTurn ? activeTurns[turnIndex + 1] : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <p className={`text-xs uppercase tracking-widest font-semibold ${labelColor}`}>
            Round {currentTurn.round} — {sideLabel}
          </p>
          <h2 className="text-2xl font-bold mt-1">Argument Rated</h2>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
          <p className="text-xs text-gray-500 mb-1">Your argument</p>
          <p className="text-sm text-gray-300 italic">&ldquo;{currentTranscript}&rdquo;</p>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Rating your argument...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-950 p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {currentFeedback && !isLoading && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                <ScoreBadge score={currentFeedback.score} />
              </div>
              <div className="text-right space-y-1 text-sm">
                {(["relevance", "reasoning", "clarity"] as const).map((k) => (
                  <div key={k} className="flex justify-end gap-3">
                    <span className="text-gray-500 capitalize">{k}</span>
                    <span className="text-white font-semibold w-6 text-right">
                      {currentFeedback.criterion_scores[k]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
              <p className="text-sm text-gray-300">{currentFeedback.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-green-800 bg-green-950 p-4 space-y-2">
                <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">
                  Strengths
                </p>
                <ul className="space-y-1">
                  {currentFeedback.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-green-200">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-800 bg-amber-950 p-4 space-y-2">
                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">
                  Improve
                </p>
                <ul className="space-y-1">
                  {currentFeedback.improvements.map((imp, i) => (
                    <li key={i} className="text-sm text-amber-200">
                      • {imp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* AI Example Argument */}
        {currentFeedback && !isLoading && (
          <div className="space-y-2">
            {!exampleArgument && !exampleLoading && (
              <button
                onClick={() => onFetchExampleArgument(currentFeedback, currentTranscript)}
                className="w-full py-2.5 border border-blue-700 bg-blue-950 hover:bg-blue-900 text-blue-300 font-semibold rounded-xl transition-colors text-sm"
              >
                ✨ See AI Example Argument
              </button>
            )}
            {exampleLoading && (
              <div className="flex items-center gap-3 justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-blue-400 text-sm">Drafting example...</p>
              </div>
            )}
            {exampleError && (
              <p className="text-red-400 text-xs text-center">{exampleError}</p>
            )}
            {exampleArgument && !exampleLoading && (
              <div className="space-y-3">
                <div className="rounded-xl border border-blue-800 bg-blue-950 p-4 space-y-2">
                  <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">
                    AI Example Argument
                  </p>
                  <p className="text-blue-100 text-sm leading-relaxed">{exampleArgument}</p>
                </div>
                {/* Explanation of why the example is better */}
                {exampleExplanationLoading && (
                  <div className="flex items-center gap-2 py-2 justify-center">
                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-yellow-400 text-xs">Explaining why this is stronger...</p>
                  </div>
                )}
                {exampleExplanationError && (
                  <p className="text-red-400 text-xs text-center">{exampleExplanationError}</p>
                )}
                {exampleExplanation && !exampleExplanationLoading && (
                  <div className="rounded-xl border border-yellow-800 bg-yellow-950/40 p-4 space-y-1">
                    <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide">
                      💡 Why this is stronger
                    </p>
                    <p className="text-yellow-100 text-sm leading-relaxed">{exampleExplanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(currentFeedback || error) && !isLoading && (
          <div className="flex gap-3">
            <button
              onClick={onRedo}
              className="flex-1 py-4 border border-gray-600 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold rounded-xl transition-colors"
            >
              ↩ Redo This Round
            </button>
            <button
              onClick={onNext}
              className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
            >
              {isLastTurn
                ? "See Summary"
                : `Next: ${nextTurn!.side === "aff" ? "AFF" : "NEG"} R${nextTurn!.round} →`}
            </button>
          </div>
        )}

        <TurnIndicator current={turnIndex} turns={activeTurns} />
      </div>
    </main>
  );
}
