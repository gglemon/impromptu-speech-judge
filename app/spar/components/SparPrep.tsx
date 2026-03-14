"use client";

import CountdownTimer from "@/components/CountdownTimer";
import { negateResolution, type PrepHints } from "./shared";

interface SparPrepProps {
  resolution: string;
  userSide: "aff" | "neg";
  opponentMode: "ai" | "friend";
  aiGenerating: boolean;
  aiGenerateError: string;
  aiData: { ai_constructive: string } | null;
  prepRemaining: number;
  prepPaused: boolean;
  prepHints: PrepHints | null;
  prepHintsLoading: boolean;
  prepHintsOpen: boolean;
  onTogglePause: () => void;
  onStartSpeechPhases: () => void;
  onToggleHints: () => void;
  onCloseHints: () => void;
}

export default function SparPrep({
  resolution,
  userSide,
  opponentMode,
  aiGenerating,
  aiGenerateError,
  aiData,
  prepRemaining,
  prepPaused,
  prepHints,
  prepHintsLoading,
  prepHintsOpen,
  onTogglePause,
  onStartSpeechPhases,
  onToggleHints,
  onCloseHints,
}: SparPrepProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-6">
        <div className="rounded-2xl border border-blue-800 bg-blue-950/40 p-5 space-y-3">
          {/* Row 1: original topic */}
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-wider font-medium mb-1">Topic</p>
            <p className="text-white text-xl leading-relaxed">{resolution}</p>
          </div>
          {/* Row 2 & 3: side badges */}
          <div className="flex gap-2 border-t border-blue-800/40 pt-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${userSide === "neg" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>
              {opponentMode === "friend" ? "Friend" : "AI"} · {userSide === "neg" ? "Aff" : "Neg"}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${userSide === "aff" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>
              You · {userSide === "aff" ? "Aff" : "Neg"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm h-5">
          {opponentMode === "ai" && (aiGenerating ? (<><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /><span className="text-gray-400">Generating AI speeches...</span></>) :
            aiGenerateError ? <span className="text-red-400 text-xs">{aiGenerateError}</span> :
            aiData ? <span className="text-green-400 text-xs">AI speeches ready</span> : null)}
        </div>

        {/* Timer — click to pause/resume */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onTogglePause}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={prepPaused ? "Resume timer" : "Pause timer"}
          >
            <CountdownTimer totalSeconds={120} remainingSeconds={prepRemaining} onComplete={onStartSpeechPhases} onSkip={onStartSpeechPhases} hideSkip />
          </button>
          <p className="text-xs text-gray-500">{prepPaused ? "Paused — click to resume" : "Click to pause"}</p>
        </div>

        {/* Bottom row: Start button + compact hints toggle */}
        <div className="flex gap-2">
          <button onClick={onStartSpeechPhases} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
            Ready — Start Debate →
          </button>
          <button
            onClick={onToggleHints}
            className="px-3 py-3 text-xs font-medium text-amber-300 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-700/40 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
            title="AI Hints"
          >
            {prepHintsLoading
              ? <><div className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />Hints</>
              : "💡 Hints"}
          </button>
        </div>

        {/* AI Hints modal */}
        {prepHintsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCloseHints}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-amber-800/50 bg-gray-900 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-amber-800/30 bg-gray-900 rounded-t-2xl">
                <div className="pr-4">
                  <p className="text-gray-500 text-xs mb-1">{resolution}</p>
                  <p className="font-semibold text-amber-300 text-sm mb-0.5">💡 AI Hints — Your Position</p>
                  <p className="text-gray-300 text-xs leading-snug">
                    {userSide === "aff" ? resolution : negateResolution(resolution)}
                  </p>
                </div>
                <button onClick={onCloseHints} className="text-gray-400 hover:text-white text-lg leading-none flex-shrink-0">✕</button>
              </div>
              <div className="p-5 space-y-5 text-sm">
                {prepHintsLoading ? (
                  <div className="flex items-center gap-2 text-amber-300/70 py-4">
                    <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Generating hints...
                  </div>
                ) : prepHints ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Framework</p>
                      <p className="text-gray-200"><span className="font-semibold text-amber-300">Value:</span> {prepHints.value}</p>
                      <p className="text-gray-300"><span className="font-semibold text-amber-300">Criterion:</span> {prepHints.criterion}</p>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Main Arguments</p>
                      {(prepHints.arguments ?? []).map((arg, i) => (
                        <div key={i} className="rounded-lg bg-gray-800/60 p-3 space-y-2 border border-gray-700/50">
                          <p className="font-semibold text-white">Arg {i + 1}: {arg.claim}</p>
                          <ul className="space-y-1">
                            {(arg.talkingPoints ?? []).map((pt, j) => (
                              <li key={j} className="flex gap-2 text-gray-300 leading-relaxed">
                                <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>{pt}
                              </li>
                            ))}
                          </ul>
                          <p className="text-amber-300/80 italic">{arg.significance}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Anticipated Counter-Arguments</p>
                      {(prepHints.counters ?? []).map((c, i) => (
                        <div key={i} className="rounded-lg bg-gray-800/60 p-3 space-y-1 border border-gray-700/50">
                          <p className="text-gray-400 text-xs italic">They may argue: &ldquo;{c.theyArgue}&rdquo;</p>
                          <p className="text-gray-200"><span className="text-green-400 font-semibold">Your rebuttal:</span> {c.yourRebuttal}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
