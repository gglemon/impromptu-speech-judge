"use client";

import { useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";

interface Improvement {
  aspect: string;
  quote: string;
  issue: string;
  suggestion: string;
}

interface FeedbackData {
  score: number;
  summary: string;
  pillar_scores?: { content: number; organization: number; delivery: number };
  strengths: string[];
  improvements: Improvement[];
  structure: { intro: string; body: string; conclusion: string };
  vocabulary: string;
  delivery: string;
}

interface FeedbackReportProps {
  feedback: FeedbackData;
  transcript: string;
  topic: string;
  audioUrl?: string;
  onReset: () => void;
}

function ScoreDial({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 10;
  const strokeDashoffset = circumference * (1 - progress);
  const color = score >= 7 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score.toFixed(1)}</span>
        <span className="text-xs text-gray-400">/ 10</span>
      </div>
    </div>
  );
}

function PillarBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const color = score >= 7 ? "bg-green-500" : score >= 5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-gray-400">{score.toFixed(1)} <span className="text-gray-600 text-xs">({weight})</span></span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-5 py-4 bg-gray-800/60 hover:bg-gray-800 transition-colors text-left"
      >
        <span className="font-semibold text-white">{title}</span>
        <span className="text-gray-400 text-xl">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-5 py-4 bg-gray-900/40">{children}</div>}
    </div>
  );
}

export default function FeedbackReport({ feedback, transcript, topic, audioUrl, onReset }: FeedbackReportProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-1">Topic: {topic}</p>
        <ScoreDial score={feedback.score} />
        <p className="mt-4 text-gray-300 text-base leading-relaxed">{feedback.summary}</p>
      </div>

      {audioUrl && <AudioPlayer audioUrl={audioUrl} />}

      {/* Pillar scores */}
      {feedback.pillar_scores && (
        <div className="border border-gray-700 rounded-xl p-5 bg-gray-800/40 space-y-4">
          <h3 className="font-semibold text-white text-sm uppercase tracking-wide">Pillar Breakdown</h3>
          <PillarBar label="Content & Analysis" score={feedback.pillar_scores.content} weight="40%" />
          <PillarBar label="Organization" score={feedback.pillar_scores.organization} weight="35%" />
          <PillarBar label="Delivery" score={feedback.pillar_scores.delivery} weight="25%" />
        </div>
      )}

      <Collapsible title="Strengths">
        <ul className="space-y-2">
          {feedback.strengths.map((s, i) => (
            <li key={i} className="flex gap-2 text-gray-300">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible title="Areas for Improvement">
        <div className="space-y-4">
          {feedback.improvements.map((imp, i) => (
            <div key={i} className="bg-gray-800/60 rounded-lg p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                {imp.aspect}
              </span>
              {imp.quote && (
                <blockquote className="border-l-2 border-gray-600 pl-3 text-gray-400 italic text-sm">
                  &ldquo;{imp.quote}&rdquo;
                </blockquote>
              )}
              <p className="text-red-400 text-sm">{imp.issue}</p>
              <p className="text-gray-300 text-sm">
                <span className="font-semibold text-indigo-300">Suggestion: </span>
                {imp.suggestion}
              </p>
            </div>
          ))}
        </div>
      </Collapsible>

      <Collapsible title="Speech Structure">
        <div className="space-y-3 text-gray-300 text-sm">
          <div>
            <span className="font-semibold text-white">Introduction: </span>
            {feedback.structure.intro}
          </div>
          <div>
            <span className="font-semibold text-white">Body: </span>
            {feedback.structure.body}
          </div>
          <div>
            <span className="font-semibold text-white">Conclusion: </span>
            {feedback.structure.conclusion}
          </div>
        </div>
      </Collapsible>

      <Collapsible title="Vocabulary & Delivery">
        <div className="space-y-3 text-gray-300 text-sm">
          <div>
            <span className="font-semibold text-white">Vocabulary: </span>
            {feedback.vocabulary}
          </div>
          <div>
            <span className="font-semibold text-white">Delivery: </span>
            {feedback.delivery}
          </div>
        </div>
      </Collapsible>

      <Collapsible title="Your Transcript">
        <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
      </Collapsible>

      <button
        onClick={onReset}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
