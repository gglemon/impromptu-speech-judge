"use client";

import CountdownTimer from "@/components/CountdownTimer";
import {
  TopicBanner,
  TtsButton,
  RecorderWithTextFallback,
  SpeechBody,
  TransitionCountdown,
  type AiData,
  type Recording,
  PHASES,
  CF_EXCHANGES,
} from "./shared";

interface SparSpeechProps {
  // Stage-level
  resolution: string;
  userSide: "aff" | "neg";
  opponentMode: "ai" | "friend";
  phaseIndex: number;
  remaining: number;
  transitionData: { nextPhaseIdx: number; label: string } | null;

  // AI data
  aiData: AiData | null;
  aiGenerateError: string;
  aiRebuttalGenerating: boolean;

  // Recordings
  recordings: { constructive?: Recording; crossfire?: Recording; rebuttal?: Recording };

  // Crossfire state
  cfExchangeIdx: number;
  cfSubPhase: "question" | "response";
  cfCurrentQuestion: string;
  cfAiResponse: string;
  cfAiResponseLoading: boolean;
  cfSuggestions: string[];
  cfSuggestionsLoading: boolean;
  cfSuggestionsOpen: boolean;
  crossfireQuestions: string[] | null;
  crossfireGenerating: boolean;

  // Rebuttal hint
  userRebuttalHint: string | null;
  userRebuttalHintLoading: boolean;
  userRebuttalHintOpen: boolean;

  // TTS
  isSpeaking: boolean;

  // Difficulty (for rebuttal hint fetch)
  difficulty: string;

  // Handlers
  onTransitionDone: (nextPhaseIdx: number) => void;
  onUserSpeechStop: (transcript: string, duration: number, audioUrl?: string) => void;
  onAiPhaseNext: () => void;
  onEndCrossfire: () => void;
  onUserQuestionDone: (transcript: string) => void;
  onReadyToRespond: () => void;
  onUserResponseDone: (transcript: string) => void;
  onAiResponseContinue: () => void;
  onFetchCfSuggestions: (mode: "question" | "response", aiQuestion?: string) => void;
  onFriendCfSubmit: (text: string) => void;
  onFriendSpeechSubmit: (text: string) => void;
  onToggleUserRebuttalHint: () => void;
  onSpeak: (text: string) => void;
  onStop: () => void;
}

export default function SparSpeech({
  resolution,
  userSide,
  opponentMode,
  phaseIndex,
  remaining,
  transitionData,
  aiData,
  aiGenerateError,
  aiRebuttalGenerating,
  recordings,
  cfExchangeIdx,
  cfSubPhase,
  cfCurrentQuestion,
  cfAiResponse,
  cfAiResponseLoading,
  cfSuggestions,
  cfSuggestionsLoading,
  cfSuggestionsOpen,
  crossfireQuestions,
  crossfireGenerating,
  userRebuttalHint,
  userRebuttalHintLoading,
  userRebuttalHintOpen,
  isSpeaking,
  onTransitionDone,
  onUserSpeechStop,
  onAiPhaseNext,
  onEndCrossfire,
  onUserQuestionDone,
  onReadyToRespond,
  onUserResponseDone,
  onAiResponseContinue,
  onFetchCfSuggestions,
  onFriendCfSubmit,
  onFriendSpeechSubmit,
  onToggleUserRebuttalHint,
  onSpeak,
  onStop,
}: SparSpeechProps) {
  // ── Transition countdown before user's turn ──────────────────────────────
  if (transitionData !== null) {
    const { nextPhaseIdx, label } = transitionData;
    const nextPhase = PHASES[nextPhaseIdx];
    const sideLabel = userSide === "aff" ? "Affirmative" : "Negative";
    const desc = nextPhase.id.includes("rebuttal")
      ? "Rebut your opponent's arguments and defend your own position."
      : `Argue the ${sideLabel} side — state your main claims with supporting evidence.`;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl space-y-10 text-center">
          <TopicBanner resolution={resolution} userSide={userSide} />
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Your Turn Coming Up</p>
            <h2 className="text-2xl font-bold text-white">{label}</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">{desc}</p>
          </div>
          <TransitionCountdown onDone={() => onTransitionDone(nextPhaseIdx)} />
        </div>
      </main>
    );
  }

  const phase = PHASES[phaseIndex];
  const isUserPhase = phase.side === userSide;
  const aiSpeechText = (phase.id === "aff_rebuttal" || phase.id === "neg_rebuttal") ? aiData?.ai_rebuttal : aiData?.ai_constructive;

  // ── Crossfire: friend mode ───────────────────────────────────────────────
  if (phase.id === "crossfire" && opponentMode === "friend") {
    const questioner = cfExchangeIdx % 2 === 0 ? "aff" : "neg";
    const responder: "aff" | "neg" = questioner === "aff" ? "neg" : "aff";
    const currentSpeaker = cfSubPhase === "question" ? questioner : responder;
    const exchangeNum = Math.floor(cfExchangeIdx / 2) + 1;
    const isUserSpeaker = currentSpeaker === userSide;
    const speakerLabel = currentSpeaker === "aff" ? "Affirmative" : "Negative";

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl space-y-5">
          <TopicBanner resolution={resolution} userSide={userSide} />
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">
              Cross-Fire · Question {exchangeNum} of 3
            </p>
            <h2 className="text-2xl font-bold text-white">
              {cfSubPhase === "question" ? `${speakerLabel} Asks` : `${responder === "aff" ? "Affirmative" : "Negative"} Responds`}
            </h2>
          </div>
          <div className="rounded-xl border border-purple-800/50 bg-purple-950/30 p-4 text-center">
            <p className="text-purple-300 text-sm font-medium">
              {isUserSpeaker ? "Your turn" : `Pass device to ${speakerLabel} (Friend)`}
            </p>
            {cfSubPhase === "response" && cfCurrentQuestion && (
              <p className="text-gray-400 text-xs mt-2 italic">&ldquo;{cfCurrentQuestion}&rdquo;</p>
            )}
          </div>
          <RecorderWithTextFallback onSubmit={onFriendCfSubmit} />
          <button onClick={onEndCrossfire} className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-gray-700/50 rounded-xl transition-colors">
            Skip Crossfire →
          </button>
        </div>
      </main>
    );
  }

  // ── Crossfire: AI mode ───────────────────────────────────────────────────
  if (phase.id === "crossfire") {
    const questioner = cfExchangeIdx % 2 === 0 ? "aff" : "neg";
    const isUserQuestioner = questioner === userSide;
    const aiQIdx = Math.floor(cfExchangeIdx / 2);
    const currentAiQuestion = crossfireQuestions?.[aiQIdx];
    const exchangeNum = Math.floor(cfExchangeIdx / 2) + 1;
    const questionerLabel = questioner === "aff" ? "Affirmative" : "Negative";
    const responderLabel = questioner === "aff" ? "Negative" : "Affirmative";

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl space-y-5">
          <TopicBanner resolution={resolution} userSide={userSide} />

          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">
              Cross-Fire · Question {exchangeNum} of 3
            </p>
            <h2 className="text-2xl font-bold text-white">
              {cfSubPhase === "question"
                ? `${questionerLabel} Asks${isUserQuestioner ? " (Your Turn)" : " (AI's Turn)"}`
                : `${responderLabel} Responds${questioner !== userSide ? " (Your Turn)" : " (AI's Turn)"}`}
            </h2>
          </div>

          {cfSubPhase === "question" ? (
            isUserQuestioner ? (
              /* User asks */
              <div className="space-y-3">
                <details className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
                  <summary className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-300 select-none">
                    View AI&rsquo;s Constructive Speech ▾
                  </summary>
                  <div className="px-4 pb-4 pt-2">
                    <SpeechBody text={aiData?.ai_constructive ?? ""} className="text-gray-300" />
                  </div>
                </details>
                <p className="text-gray-400 text-sm text-center">Ask the AI a question about the resolution</p>
                <RecorderWithTextFallback onSubmit={(transcript) => onUserQuestionDone(transcript)} />
                <button
                  onClick={() => onFetchCfSuggestions("question")}
                  disabled={cfSuggestionsLoading}
                  className="w-full py-2 text-sm font-medium text-purple-300 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/50 rounded-xl transition-colors disabled:opacity-40"
                >
                  {cfSuggestionsLoading ? "Generating suggestions..." : "💡 Suggest Questions to Ask"}
                </button>
                {cfSuggestionsOpen && (
                  <div className="rounded-xl border border-purple-800/50 bg-purple-950/30 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">Suggested Questions</p>
                    {cfSuggestionsLoading ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </div>
                    ) : cfSuggestions.map((s, i) => (
                      <div key={i} className="rounded-lg bg-gray-800/60 px-3 py-2 text-sm text-gray-200 leading-relaxed">
                        <span className="text-purple-400 font-bold mr-1">{i + 1}.</span>{s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* AI asks */
              <div className="space-y-4">
                {crossfireGenerating && !currentAiQuestion ? (
                  <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5 flex items-center gap-3 text-gray-400 text-sm">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Generating question based on your speech...
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        AI Debate Agent asks
                      </p>
                      {currentAiQuestion && (
                        <TtsButton text={currentAiQuestion} isSpeaking={isSpeaking}
                          onPlay={() => onSpeak(currentAiQuestion!)} onStop={onStop} />
                      )}
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed">
                      {currentAiQuestion ?? "No question available."}
                    </p>
                  </div>
                )}
                <button onClick={onReadyToRespond} disabled={crossfireGenerating && !currentAiQuestion}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors">
                  Ready to Respond →
                </button>
                {currentAiQuestion && (
                  <>
                    <button
                      onClick={() => onFetchCfSuggestions("response", currentAiQuestion)}
                      disabled={cfSuggestionsLoading}
                      className="w-full py-2 text-sm font-medium text-purple-300 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/50 rounded-xl transition-colors disabled:opacity-40"
                    >
                      {cfSuggestionsLoading ? "Generating suggestions..." : "💡 Suggest Possible Answers"}
                    </button>
                    {cfSuggestionsOpen && (
                      <div className="rounded-xl border border-purple-800/50 bg-purple-950/30 p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">Suggested Answers</p>
                        {cfSuggestionsLoading ? (
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </div>
                        ) : cfSuggestions.map((s, i) => (
                          <div key={i} className="rounded-lg bg-gray-800/60 px-3 py-2 text-sm text-gray-200 leading-relaxed">
                            <span className="text-purple-400 font-bold mr-1">{i + 1}.</span>{s}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          ) : (
            /* Response sub-phase */
            questioner !== userSide ? (
              /* User responds to AI's question */
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-700 bg-gray-800/30 px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">AI asked:</p>
                  <p className="text-gray-300 text-sm italic">&ldquo;{currentAiQuestion}&rdquo;</p>
                </div>
                <RecorderWithTextFallback onSubmit={(transcript) => onUserResponseDone(transcript)} />
                <button
                  onClick={() => onFetchCfSuggestions("response", currentAiQuestion)}
                  disabled={cfSuggestionsLoading}
                  className="w-full py-2 text-sm font-medium text-purple-300 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/50 rounded-xl transition-colors disabled:opacity-40"
                >
                  {cfSuggestionsLoading ? "Generating suggestions..." : "💡 Suggest Possible Responses"}
                </button>
                {cfSuggestionsOpen && (
                  <div className="rounded-xl border border-purple-800/50 bg-purple-950/30 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">Suggested Responses</p>
                    {cfSuggestionsLoading ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </div>
                    ) : cfSuggestions.map((s, i) => (
                      <div key={i} className="rounded-lg bg-gray-800/60 px-3 py-2 text-sm text-gray-200 leading-relaxed">
                        <span className="text-purple-400 font-bold mr-1">{i + 1}.</span>{s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* AI responds to user's question */
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-700 bg-gray-800/30 px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">You asked:</p>
                  <p className="text-gray-300 text-sm italic">&ldquo;{cfCurrentQuestion}&rdquo;</p>
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">AI responds</p>
                    {cfAiResponse && (
                      <TtsButton text={cfAiResponse} isSpeaking={isSpeaking}
                        onPlay={() => onSpeak(cfAiResponse)} onStop={onStop} />
                    )}
                  </div>
                  {cfAiResponseLoading ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Generating response...
                    </div>
                  ) : (
                    <p className="text-gray-200 text-sm leading-relaxed">{cfAiResponse}</p>
                  )}
                </div>
                <button onClick={onAiResponseContinue} disabled={cfAiResponseLoading}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors">
                  {cfExchangeIdx >= CF_EXCHANGES - 1 ? "End Crossfire →" : "Next Question →"}
                </button>
              </div>
            )
          )}

          <button
            onClick={onEndCrossfire}
            className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-gray-700/50 rounded-xl transition-colors"
          >
            Skip Crossfire →
          </button>
        </div>
      </main>
    );
  }

  // ── Constructive / Rebuttal — waiting for AI data ────────────────────────
  if (!isUserPhase && !aiData) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl space-y-4">
          <TopicBanner resolution={resolution} userSide={userSide} />
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white text-lg font-medium">Generating AI speech...</p>
            {aiGenerateError && <p className="text-red-400 text-sm">{aiGenerateError}</p>}
          </div>
        </div>
      </main>
    );
  }

  // ── Constructive / Rebuttal — main view ──────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-6">
        <TopicBanner resolution={resolution} userSide={userSide} />
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Phase {phaseIndex + 1} of {PHASES.length}</p>
          <h2 className="text-2xl font-bold text-white">{phase.label}</h2>
          <p className="text-sm text-gray-400">
            {isUserPhase ? `Your turn — arguing ${userSide === "aff" ? "Affirmative" : "Negative"}` : `AI's turn — ${userSide === "aff" ? "Negative" : "Affirmative"} side`}
          </p>
        </div>
        <CountdownTimer totalSeconds={phase.seconds} remainingSeconds={remaining}
          onComplete={isUserPhase ? () => {} : onAiPhaseNext}
          onSkip={isUserPhase ? () => {} : onAiPhaseNext} hideSkip />
        {isUserPhase ? (
          <div className="space-y-3">
            {(phase.id === "aff_rebuttal" || phase.id === "neg_rebuttal") && (
              <div className="space-y-2">
                <button
                  onClick={onToggleUserRebuttalHint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-900/50 hover:bg-yellow-900/80 border border-yellow-700 text-yellow-300 text-xs font-semibold transition-colors"
                >
                  💡 {userRebuttalHint ? (userRebuttalHintOpen ? "Hide Hint" : "Show Hint") : "Rebuttal Hint"}
                </button>
                {userRebuttalHintOpen && (
                  <div className="rounded-xl border border-yellow-800/60 bg-yellow-950/30 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-yellow-500">Suggested Rebuttal</p>
                    {userRebuttalHintLoading ? (
                      <div className="flex items-center gap-2 text-yellow-400 text-sm">
                        <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                        Generating rebuttal hint…
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto">
                        <SpeechBody text={userRebuttalHint ?? ""} className="text-yellow-200" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <RecorderWithTextFallback onSubmit={(text) => onUserSpeechStop(text, 0)} />
          </div>
        ) : opponentMode === "friend" ? (
          /* Friend records their constructive/rebuttal */
          <div className="space-y-4">
            <div className="rounded-xl border border-purple-800/50 bg-purple-950/30 p-4 text-center">
              <p className="text-purple-300 font-medium text-sm">Pass device to Friend ({userSide === "aff" ? "Negative" : "Affirmative"} side)</p>
              <p className="text-gray-400 text-xs mt-1">Friend records their {phase.id.includes("rebuttal") ? "rebuttal" : "constructive"} speech</p>
            </div>
            <RecorderWithTextFallback onSubmit={onFriendSpeechSubmit} />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  AI Speech — {userSide === "aff" ? "Negative" : "Affirmative"} Side
                </p>
                {!aiRebuttalGenerating && aiSpeechText && (
                  <TtsButton text={aiSpeechText} isSpeaking={isSpeaking}
                    onPlay={() => onSpeak(aiSpeechText)} onStop={onStop} />
                )}
              </div>
              {aiRebuttalGenerating && (phase.id === "aff_rebuttal" || phase.id === "neg_rebuttal") ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Generating AI rebuttal based on your speeches…
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <SpeechBody text={aiSpeechText ?? ""} />
                </div>
              )}
            </div>
            <button
              onClick={onAiPhaseNext}
              disabled={aiRebuttalGenerating && (phase.id === "aff_rebuttal" || phase.id === "neg_rebuttal")}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
            >
              Continue →
            </button>
          </>
        )}
      </div>
    </main>
  );
}
