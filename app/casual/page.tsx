"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPlayer from "@/components/AudioPlayer";
import CasualFeedbackReport from "@/components/CasualFeedbackReport";
import { casualTopics } from "@/lib/casualTopics";

type Stage = "loading" | "topic" | "preview" | "recording" | "processing" | "feedback";

interface CasualFeedback {
  score: number;
  emoji: string;
  summary: string;
  highlights: string[];
  tip: string;
  length_note?: string;
  ai_example?: string;
}

export default function CasualPage() {
  const [stage, setStage] = useState<Stage>("loading");
  const [topic, setTopic] = useState("");
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [feedback, setFeedback] = useState<CasualFeedback | null>(null);
  const [error, setError] = useState("");
  const [recordingStarted, setRecordingStarted] = useState(false);
  const [speechLength, setSpeechLength] = useState<number>(60);
  const [aiExample, setAiExample] = useState("");
  const [aiExampleLoading, setAiExampleLoading] = useState(false);
  const [aiExampleError, setAiExampleError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  function speakExample() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(aiExample);
    utt.rate = 0.92;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }

  async function handleShowExample() {
    setAiExample("");
    setAiExampleError("");
    setAiExampleLoading(true);
    setStage("preview");
    try {
      const res = await fetch("/api/casual-example", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, speechLength }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAiExample(data.ai_example ?? "");
    } catch (e: unknown) {
      setAiExampleError(e instanceof Error ? e.message : "Could not generate example");
    } finally {
      setAiExampleLoading(false);
    }
  }

  // Pick a random topic immediately on mount
  useEffect(() => {
    const t = casualTopics[Math.floor(Math.random() * casualTopics.length)];
    setTopic(t);
    setStage("topic");
  }, []);

  async function handleStop(transcript: string, duration: number, recordingUrl: string) {
    setTranscript(transcript);
    setAudioUrl(recordingUrl);
    setStage("processing");

    try {
      const res = await fetch("/api/casual-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, transcript, speechLength, actualDuration: Math.round(duration) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Feedback failed");
      setFeedback(data);
      setStage("feedback");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("processing"); // stays on processing with error shown
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Home
          </Link>
          <span className="text-sm text-emerald-400 font-medium">💬 Free Talk</span>
        </div>

        {/* Loading */}
        {stage === "loading" && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Getting your topic...</p>
          </div>
        )}

        {/* Topic */}
        {stage === "topic" && (
          <div className="space-y-8 text-center">
            <div className="rounded-2xl bg-emerald-950 border border-emerald-700 p-8 space-y-4">
              <p className="text-emerald-300 text-sm font-medium uppercase tracking-wide">Your Topic</p>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                rows={2}
                placeholder="Type a topic..."
                className="text-3xl font-bold text-white leading-snug text-center w-full bg-transparent border-none resize-none focus:outline-none placeholder-emerald-900"
              />
            </div>

            <div className="space-y-3">
              <p className="text-gray-400 text-sm">How long do you want to speak?</p>
              <div className="flex gap-2 justify-center">
                {[
                  { label: "30 sec", value: 30 },
                  { label: "1 min", value: 60 },
                  { label: "1.5 min", value: 90 },
                  { label: "2 min", value: 120 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSpeechLength(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      speechLength === opt.value
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-gray-400">Take a breath, then press the button when you are ready to talk!</p>
            <button
              onClick={handleShowExample}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl transition-colors"
            >
              See Example &amp; Start 🎤
            </button>
          </div>
        )}

        {/* Preview: AI example speech */}
        {stage === "preview" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-emerald-950 border border-emerald-700 p-5 text-center">
              <p className="text-emerald-300 text-sm font-medium uppercase tracking-wide mb-1">Your Topic</p>
              <p className="text-xl font-semibold text-white">{topic}</p>
              <p className="text-emerald-400 text-xs mt-1">Target: {speechLength < 60 ? `${speechLength}s` : `${speechLength / 60} min`}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-300 text-center">✨ AI Example Speech</p>
              {aiExampleLoading ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Writing example...</p>
                </div>
              ) : aiExampleError ? (
                <p className="text-red-400 text-sm text-center">{aiExampleError}</p>
              ) : aiExample ? (
                <div className="rounded-xl bg-gray-800 border border-gray-700 p-5 space-y-3">
                  <div className="flex justify-end">
                    {isSpeaking ? (
                      <button onClick={stopSpeaking} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/60 border border-red-700 text-red-300 text-xs font-semibold">
                        ■ Stop
                      </button>
                    ) : (
                      <button onClick={speakExample} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/60 border border-blue-700 text-blue-300 text-xs font-semibold">
                        ▶ Play
                      </button>
                    )}
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed">{aiExample}</p>
                </div>
              ) : null}
            </div>

            <p className="text-gray-400 text-center text-sm">Read the example, then give your own speech!</p>
            <button
              onClick={() => { stopSpeaking(); setStage("recording"); }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl transition-colors"
            >
              Start Speaking 🎤
            </button>
          </div>
        )}

        {/* Recording */}
        {stage === "recording" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-emerald-950 border border-emerald-700 p-6 text-center">
              <p className="text-emerald-300 text-sm font-medium uppercase tracking-wide mb-2">Your Topic</p>
              <p className="text-xl font-semibold text-white">{topic}</p>
              <p className="text-emerald-400 text-xs mt-2">Target: {speechLength < 60 ? `${speechLength}s` : `${speechLength / 60} min`}</p>
            </div>
            {recordingStarted ? (
              <AudioRecorder onStop={handleStop} />
            ) : (
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setRecordingStarted(true)}
                  className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors text-lg"
                >
                  🎙 Start Recording
                </button>
              </div>
            )}
          </div>
        )}

        {/* Processing */}
        {stage === "processing" && (
          <div className="space-y-6">
            {error ? (
              <div className="rounded-xl bg-red-950 border border-red-700 p-5 text-center space-y-3">
                <p className="text-red-300 font-medium">Something went wrong</p>
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={() => { setError(""); setStage("topic"); }}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-300 font-medium">Reading your speech...</p>
                {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
                {transcript && (
                  <div className="w-full rounded-xl bg-gray-800 border border-gray-700 p-4 mt-2">
                    <p className="text-xs text-gray-500 mb-1">What we heard</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{transcript}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        {stage === "feedback" && feedback && (
          <CasualFeedbackReport
            feedback={feedback}
            topic={topic}
            transcript={transcript}
            audioUrl={audioUrl}
            onRedo={() => {
              setFeedback(null);
              setTranscript("");
              setAudioUrl("");
              setError("");
              setRecordingStarted(false);
              setAiExample("");
              setAiExampleError("");
              setStage("topic");
            }}
          />
        )}
      </div>
    </main>
  );
}
