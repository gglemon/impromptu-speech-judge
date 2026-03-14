import AudioRecorder from "@/components/AudioRecorder";
import { TurnIndicator } from "./SharedUI";
import type { ArgumentResult } from "./types";

export interface DebateRecordingProps {
  topic: string;
  currentTurn: { side: "aff" | "neg"; round: number };
  turnIndex: number;
  activeTurns: Array<{ side: "aff" | "neg"; round: number }>;
  practiceMode: "solo" | "friend";
  userSide: "aff" | "neg";
  isRedoing: boolean;
  originalForRedo: { transcript: string; feedback: { score: number; summary: string } } | null;
  inputMode: "voice" | "text" | "ai";
  textInput: string;
  recordingStarted: boolean;
  hint: string;
  hintLoading: boolean;
  hintError: string;
  results: ArgumentResult[];
  onSetInputMode: (mode: "voice" | "text" | "ai") => void;
  onSetTextInput: (val: string) => void;
  onSetRecordingStarted: (val: boolean) => void;
  onRecordingDone: (transcript: string) => void;
  onFetchHint: () => void;
}

export function DebateRecording({
  topic,
  currentTurn,
  turnIndex,
  activeTurns,
  practiceMode,
  userSide,
  isRedoing,
  originalForRedo,
  inputMode,
  textInput,
  recordingStarted,
  hint,
  hintLoading,
  hintError,
  results,
  onSetInputMode,
  onSetTextInput,
  onSetRecordingStarted,
  onRecordingDone,
  onFetchHint,
}: DebateRecordingProps) {
  const isAff = currentTurn.side === "aff";
  const sideLabel = isAff ? "AFFIRMATIVE" : "NEGATIVE";
  const instruction = isAff ? "Argue FOR the resolution" : "Argue AGAINST the resolution";
  const borderColor = isAff ? "border-purple-700" : "border-orange-700";
  const bgColor = isAff ? "bg-purple-950" : "bg-orange-950";
  const labelColor = isAff ? "text-purple-400" : "text-orange-400";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <p className={`text-xs uppercase tracking-widest font-semibold ${labelColor}`}>
            Round {currentTurn.round} — {sideLabel}
            {isRedoing ? " — REDO" : ""}
          </p>
        </div>

        {/* Friend mode: pass device banner */}
        {practiceMode === "friend" && currentTurn.side !== userSide && !isRedoing && (
          <div className="rounded-xl border border-purple-700 bg-purple-950/50 p-4 text-center space-y-1">
            <p className="text-purple-300 font-semibold">Pass device to your friend</p>
            <p className="text-purple-400 text-xs">
              Friend argues the {isAff ? "Affirmative" : "Negative"} side
            </p>
          </div>
        )}

        <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5 space-y-2`}>
          <p className="text-xs text-gray-400">{instruction}:</p>
          <p className="text-white font-medium">&ldquo;{topic}&rdquo;</p>
        </div>

        {/* Previous original shown during redo */}
        {isRedoing && originalForRedo && (
          <div className="rounded-xl border border-gray-600 bg-gray-900 p-4 space-y-1">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              Your previous attempt
            </p>
            <p className="text-sm text-gray-400 italic">
              &ldquo;{originalForRedo.transcript}&rdquo;
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Score: {originalForRedo.feedback.score}/10 — {originalForRedo.feedback.summary}
            </p>
          </div>
        )}

        <div className="flex flex-col items-center gap-6">
          <div className="flex rounded-xl overflow-hidden border border-gray-700">
            <button
              onClick={() => onSetInputMode("voice")}
              className={`px-6 py-2 text-sm font-semibold transition-colors ${
                inputMode === "voice"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-900 text-gray-500 hover:text-gray-300"
              }`}
            >
              🎙 Voice
            </button>
            <button
              onClick={() => onSetInputMode("text")}
              disabled={recordingStarted}
              className={`px-6 py-2 text-sm font-semibold transition-colors ${
                recordingStarted ? "opacity-40 cursor-not-allowed" : ""
              } ${
                inputMode === "text"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-900 text-gray-500 hover:text-gray-300"
              }`}
            >
              ✏️ Text
            </button>
            <button
              onClick={() => {
                onSetInputMode("ai");
                if (!hint && !hintLoading) onFetchHint();
              }}
              disabled={recordingStarted}
              className={`px-6 py-2 text-sm font-semibold transition-colors ${
                recordingStarted ? "opacity-40 cursor-not-allowed" : ""
              } ${
                inputMode === "ai"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-900 text-gray-500 hover:text-gray-300"
              }`}
            >
              💡 AI
            </button>
          </div>

          {inputMode === "voice" ? (
            recordingStarted ? (
              <AudioRecorder onStop={(transcript) => onRecordingDone(transcript)} />
            ) : (
              <button
                onClick={() => onSetRecordingStarted(true)}
                className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors text-lg"
              >
                🎙 Start Recording
              </button>
            )
          ) : inputMode === "text" ? (
            <div className="flex flex-col gap-3 w-full">
              <textarea
                value={textInput}
                onChange={(e) => onSetTextInput(e.target.value)}
                placeholder="Type your argument here..."
                className="w-full h-36 p-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm leading-relaxed resize-none focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <button
                onClick={() => {
                  if (textInput.trim()) onRecordingDone(textInput.trim());
                }}
                disabled={!textInput.trim()}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
              >
                Submit Argument
              </button>
            </div>
          ) : (
            <div className="w-full space-y-3">
              {hintLoading && (
                <div className="flex items-center gap-3 justify-center py-4">
                  <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-yellow-400 text-sm">Getting hint...</p>
                </div>
              )}
              {hintError && (
                <p className="text-red-400 text-sm text-center">{hintError}</p>
              )}
              {hint && !hintLoading && (
                <div className="rounded-xl border border-yellow-800 bg-yellow-950 p-4 space-y-2">
                  <p className="text-xs text-yellow-500 font-semibold uppercase tracking-wide">
                    Coach hint
                  </p>
                  <p className="text-yellow-100 text-sm leading-relaxed">{hint}</p>
                  <button
                    onClick={onFetchHint}
                    className="text-xs text-yellow-600 hover:text-yellow-400 transition-colors pt-1"
                  >
                    Try another hint →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Past arguments history */}
        {results.length > 0 && (
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
              Your previous arguments
            </p>
            <div className="space-y-2">
              {results.map((r, i) => {
                const rIsAff = r.side === "aff";
                const tagColor = rIsAff ? "text-purple-400" : "text-orange-400";
                const scoreColor =
                  r.score >= 8
                    ? "text-green-400"
                    : r.score >= 6
                    ? "text-yellow-400"
                    : "text-red-400";
                return (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className={`shrink-0 font-semibold ${tagColor}`}>
                      {rIsAff ? "AFF" : "NEG"} R{r.round}
                    </span>
                    <span className="text-gray-300 flex-1">{r.transcript}</span>
                    <span className={`shrink-0 font-bold ${scoreColor}`}>{r.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <TurnIndicator current={turnIndex} turns={activeTurns} />
      </div>
    </main>
  );
}
