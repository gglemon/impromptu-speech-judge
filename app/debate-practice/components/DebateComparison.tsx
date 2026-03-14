import { ScoreBadge, ScoreDiff, CriterionRow, TurnIndicator } from "./SharedUI";
import type { ArgumentFeedback, RedoComparison } from "./types";

export interface DebateComparisonProps {
  currentTurn: { side: "aff" | "neg"; round: number };
  turnIndex: number;
  activeTurns: Array<{ side: "aff" | "neg"; round: number }>;
  isLastTurn: boolean;
  isLoading: boolean;
  originalForRedo: { transcript: string; feedback: ArgumentFeedback } | null;
  redoFeedback: ArgumentFeedback | null;
  redoTranscript: string;
  comparison: RedoComparison | null;
  comparisonLoading: boolean;
  comparisonError: string;
  onContinue: () => void;
}

export function DebateComparison({
  currentTurn,
  turnIndex,
  activeTurns,
  isLastTurn,
  isLoading,
  originalForRedo,
  redoFeedback,
  redoTranscript,
  comparison,
  comparisonLoading,
  comparisonError,
  onContinue,
}: DebateComparisonProps) {
  const isAff = currentTurn.side === "aff";
  const sideLabel = isAff ? "AFFIRMATIVE" : "NEGATIVE";
  const labelColor = isAff ? "text-purple-400" : "text-orange-400";
  const orig = originalForRedo;
  const redo = redoFeedback;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <p className={`text-xs uppercase tracking-widest font-semibold ${labelColor}`}>
            Round {currentTurn.round} — {sideLabel}
          </p>
          <h2 className="text-2xl font-bold mt-1">Redo Comparison</h2>
        </div>

        {/* Redo loading */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Rating your redo...</p>
          </div>
        )}

        {/* Side-by-side once redo feedback is ready */}
        {orig && redo && !isLoading && (
          <>
            {/* Score comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  Original
                </p>
                <div>
                  <ScoreBadge score={orig.feedback.score} />
                </div>
                <CriterionRow
                  label="Relevance"
                  original={orig.feedback.criterion_scores.relevance}
                  redo={redo.criterion_scores.relevance}
                />
                <CriterionRow
                  label="Reasoning"
                  original={orig.feedback.criterion_scores.reasoning}
                  redo={redo.criterion_scores.reasoning}
                />
                <CriterionRow
                  label="Clarity"
                  original={orig.feedback.criterion_scores.clarity}
                  redo={redo.criterion_scores.clarity}
                />
              </div>
              <div className="rounded-xl border border-purple-700 bg-gray-900 p-5 space-y-3">
                <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide">
                  Redo
                </p>
                <div className="flex items-baseline gap-1">
                  <ScoreBadge score={redo.score} />
                  <ScoreDiff original={orig.feedback.score} redo={redo.score} />
                </div>
                <CriterionRow
                  label="Relevance"
                  original={orig.feedback.criterion_scores.relevance}
                  redo={redo.criterion_scores.relevance}
                />
                <CriterionRow
                  label="Reasoning"
                  original={orig.feedback.criterion_scores.reasoning}
                  redo={redo.criterion_scores.reasoning}
                />
                <CriterionRow
                  label="Clarity"
                  original={orig.feedback.criterion_scores.clarity}
                  redo={redo.criterion_scores.clarity}
                />
              </div>
            </div>

            {/* Summaries */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="text-xs text-gray-500 mb-2">Original analysis</p>
                <p className="text-sm text-gray-400">{orig.feedback.summary}</p>
              </div>
              <div className="rounded-xl border border-purple-800 bg-gray-900 p-4">
                <p className="text-xs text-purple-400 mb-2">Redo analysis</p>
                <p className="text-sm text-gray-300">{redo.summary}</p>
              </div>
            </div>

            {/* Transcripts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="text-xs text-gray-500 mb-2">Original argument</p>
                <p className="text-sm text-gray-500 italic">&ldquo;{orig.transcript}&rdquo;</p>
              </div>
              <div className="rounded-xl border border-purple-800 bg-gray-900 p-4">
                <p className="text-xs text-purple-400 mb-2">Redo argument</p>
                <p className="text-sm text-gray-300 italic">&ldquo;{redoTranscript}&rdquo;</p>
              </div>
            </div>

            {/* AI comparison */}
            {comparisonLoading && (
              <div className="flex items-center gap-3 justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Analyzing improvements...</p>
              </div>
            )}
            {comparisonError && (
              <p className="text-red-400 text-sm text-center">{comparisonError}</p>
            )}
            {comparison && !comparisonLoading && (
              <div className="rounded-xl border border-blue-800 bg-blue-950 p-5 space-y-4">
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">
                  What improved
                </p>

                {comparison.key_improvements.length > 0 && (
                  <ul className="space-y-2">
                    {comparison.key_improvements.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-blue-100">
                        <span className="text-green-400 shrink-0">▲</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {comparison.regressions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">
                      Watch out
                    </p>
                    <ul className="space-y-1">
                      {comparison.regressions.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-amber-200">
                          <span className="text-amber-400 shrink-0">▼</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-blue-200 border-t border-blue-800 pt-3">
                  {comparison.verdict}
                </p>
              </div>
            )}

            <button
              onClick={onContinue}
              disabled={isLoading}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors text-lg"
            >
              {isLastTurn ? "See Summary" : `Continue →`}
            </button>
          </>
        )}

        <TurnIndicator current={turnIndex} turns={activeTurns} />
      </div>
    </main>
  );
}
