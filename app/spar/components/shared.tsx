"use client";

import { useState, useEffect, useRef } from "react";
import AudioRecorder from "@/components/AudioRecorder";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Stage = "setup" | "prep" | "speech" | "processing" | "feedback";
export type CfSubPhase = "question" | "response";

export interface Phase {
  id: string;
  label: string;
  side: "aff" | "neg" | "both";
  seconds: number;
}

export interface Recording {
  transcript: string;
  audioUrl?: string;
}

export interface AiData {
  ai_constructive: string;
  ai_rebuttal?: string;
  aiSide: "aff" | "neg";
}

export interface SparFeedback {
  overall_score: number;
  overall_summary: string;
  constructive: { score: number; feedback: string };
  crossfire: { score: number; feedback: string };
  rebuttal: { score: number; feedback: string };
  strengths: string[];
  improvements: { aspect: string; issue: string; suggestion: string }[];
}

export interface PrepHints {
  value: string;
  criterion: string;
  arguments: { claim: string; talkingPoints: string[]; significance: string }[];
  counters: { theyArgue: string; yourRebuttal: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const PHASES: Phase[] = [
  { id: "aff_constructive", label: "Affirmative Constructive", side: "aff", seconds: 120 },
  { id: "neg_constructive", label: "Negative Constructive", side: "neg", seconds: 120 },
  { id: "crossfire",        label: "Cross-Fire",             side: "both", seconds: 120 },
  { id: "aff_rebuttal",    label: "Affirmative Rebuttal",    side: "aff", seconds: 120 },
  { id: "neg_rebuttal",    label: "Negative Rebuttal",       side: "neg", seconds: 120 },
];

export const CF_EXCHANGES = 6;

// ─── Utility ──────────────────────────────────────────────────────────────────

export function negateResolution(r: string): string {
  const pairs: [RegExp, string][] = [
    [/\bshould\b/i, "should not"],
    [/\bare\b/i, "are not"],
    [/\bis\b/i, "is not"],
    [/\bdoes\b/i, "does not"],
    [/\bdo\b/i, "do not"],
    [/\bwill\b/i, "will not"],
    [/\bwould\b/i, "would not"],
    [/\bcan\b/i, "cannot"],
    [/\bmust\b/i, "must not"],
    [/\bhas\b/i, "has not"],
    [/\bhave\b/i, "have not"],
    [/\bwas\b/i, "was not"],
    [/\bwere\b/i, "were not"],
  ];
  for (const [regex, replacement] of pairs) {
    if (regex.test(r)) return r.replace(regex, replacement);
  }
  return `Not: ${r}`;
}

// ─── Shared UI components ─────────────────────────────────────────────────────

export function TopicBanner({ resolution, userSide }: { resolution: string; userSide: "aff" | "neg" }) {
  if (!resolution) return null;
  return (
    <div className="w-full max-w-xl mx-auto mb-2 rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-2 flex items-start gap-3">
      <span className="text-xs text-gray-500 uppercase tracking-wider font-medium mt-0.5 flex-shrink-0">Topic</span>
      <span className="text-gray-300 text-sm leading-relaxed flex-1">{resolution}</span>
      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${userSide === "aff" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
        {userSide === "aff" ? "Aff" : "Neg"}
      </span>
    </div>
  );
}

export function TtsButton({ text, isSpeaking, onPlay, onStop }: { text: string; isSpeaking: boolean; onPlay: () => void; onStop: () => void }) {
  return isSpeaking ? (
    <button onClick={onStop} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-900 border border-red-700 text-red-300 text-xs font-semibold">
      <span className="w-2 h-2 bg-red-400 rounded-sm inline-block" /> Stop
    </button>
  ) : (
    <button onClick={onPlay} disabled={!text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-900 border border-blue-700 text-blue-300 text-xs font-semibold disabled:opacity-40">
      <span className="text-base leading-none">▶</span> Play
    </button>
  );
}

export function RecorderWithTextFallback({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [useText, setUseText] = useState(false);
  const [text, setText] = useState("");
  if (useText) {
    return (
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          placeholder="Type your speech here..."
          className="w-full rounded-xl bg-gray-800 border border-gray-600 text-gray-200 text-sm p-3 resize-none focus:outline-none focus:border-gray-400"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (text.trim()) onSubmit(text.trim()); }}
            disabled={!text.trim()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Submit
          </button>
          <button onClick={() => { setUseText(false); setText(""); }} className="text-xs text-gray-500 hover:text-gray-400">
            use mic
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <AudioRecorder onStop={(transcript) => onSubmit(transcript)} />
      <div className="text-right">
        <button onClick={() => setUseText(true)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          or type instead
        </button>
      </div>
    </div>
  );
}

export function SpeechBody({ text, className = "text-gray-200" }: { text: string; className?: string }) {
  const paras = text.split(/\n\n+/).filter(Boolean);
  if (paras.length <= 1) {
    const lines = text.split(/\n/).filter(Boolean);
    return (
      <div className="space-y-3">
        {lines.map((line, i) => (
          <p key={i} className={`text-sm leading-relaxed ${className}`}>{line}</p>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {paras.map((para, i) => (
        <p key={i} className={`text-sm leading-relaxed ${className}`}>{para}</p>
      ))}
    </div>
  );
}

export function TransitionCountdown({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(10);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          onDoneRef.current();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []); // eslint-disable-line

  function handleSkip() {
    if (timerRef.current) clearInterval(timerRef.current);
    onDoneRef.current();
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-blue-900" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" style={{ animationDuration: "1s" }} />
        <span className="text-4xl font-bold text-white">{count}</span>
      </div>
      <button onClick={handleSkip} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
        Start Now →
      </button>
    </div>
  );
}
