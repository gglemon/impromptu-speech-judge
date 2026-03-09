"use client";

import { useState } from "react";
import Link from "next/link";
import AudioPlayer from "@/components/AudioPlayer";

interface ConstructiveRatings { content: number; structure: number; delivery: number }
interface CrossfireRatings { cross_examination: number; delivery: number }
interface RebuttalRatings { content: number; refutation: number; delivery: number }

interface PhaseScore<R> {
  score: number;
  feedback: string;
  ratings?: R;
}

interface SparFeedbackData {
  overall_score: number;
  overall_summary: string;
  constructive: PhaseScore<ConstructiveRatings>;
  crossfire: PhaseScore<CrossfireRatings>;
  rebuttal: PhaseScore<RebuttalRatings>;
  strengths: string[];
  improvements: { aspect: string; issue: string; suggestion: string }[];
}

interface Recording {
  transcript: string;
  audioUrl?: string;
}

interface PrepHints {
  value: string;
  criterion: string;
  arguments: { claim: string; talkingPoints: string[]; significance: string }[];
  counters: { theyArgue: string; yourRebuttal: string }[];
}

interface CfSuggestions {
  questions: string[];          // suggested questions the user could have asked
  answers: string[][];          // for each AI crossfire question, suggested answers
}

interface SparFeedbackReportProps {
  feedback: SparFeedbackData;
  resolution: string;
  userSide: "aff" | "neg";
  userName: string;
  recordings: {
    constructive?: Recording;
    crossfire?: Recording;
    rebuttal?: Recording;
  };
  aiConstructive: string;
  aiRebuttal: string;
  crossfireQuestions?: string[];
  hints?: PrepHints | null;
  cfSuggestions?: CfSuggestions | null;
  onReset: () => void;
}

function negateResolution(r: string): string {
  const pairs: [RegExp, string][] = [
    [/\bshould\b/i, "should not"], [/\bare\b/i, "are not"], [/\bis\b/i, "is not"],
    [/\bdoes\b/i, "does not"], [/\bdo\b/i, "do not"], [/\bwill\b/i, "will not"],
    [/\bwould\b/i, "would not"], [/\bcan\b/i, "cannot"], [/\bmust\b/i, "must not"],
    [/\bhas\b/i, "has not"], [/\bhave\b/i, "have not"], [/\bwas\b/i, "was not"], [/\bwere\b/i, "were not"],
  ];
  for (const [regex, replacement] of pairs) {
    if (regex.test(r)) return r.replace(regex, replacement);
  }
  return `Not: ${r}`;
}

function ScoreDial({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 10);
  const color = score >= 7 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score.toFixed(1)}</span>
        <span className="text-xs text-gray-400">/ 10</span>
      </div>
    </div>
  );
}

function CriterionBar({ label, score }: { label: string; score: number }) {
  const color = score >= 7 ? "bg-green-500" : score >= 5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={`font-semibold ${score >= 7 ? "text-green-400" : score >= 5 ? "text-amber-400" : "text-red-400"}`}>
          {score.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}

function PhaseBar({ label, score }: { label: string; score: number }) {
  const color = score >= 7 ? "bg-green-500" : score >= 5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-gray-400">{score.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}

function Collapsible({ title, defaultOpen = true, children, headerRight }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode; headerRight?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center bg-gray-800/60 hover:bg-gray-800 transition-colors">
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex justify-between items-center px-5 py-4 text-left"
        >
          <span className="font-semibold text-white">{title}</span>
          <span className="text-gray-400 text-xl">{open ? "−" : "+"}</span>
        </button>
        {headerRight && <div className="pr-4">{headerRight}</div>}
      </div>
      {open && <div className="px-5 py-4 bg-gray-900/40">{children}</div>}
    </div>
  );
}

function RecordingFooter({ recording }: { recording?: Recording }) {
  if (!recording) return null;
  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-gray-700/50">
      {recording.audioUrl && <AudioPlayer audioUrl={recording.audioUrl} />}
      {recording.transcript && (
        <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap">{recording.transcript}</p>
      )}
    </div>
  );
}

function HintsModal({ open, onClose, hints, resolution, userSide }: {
  open: boolean; onClose: () => void; hints: PrepHints | null;
  resolution: string; userSide: "aff" | "neg";
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
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
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none flex-shrink-0">✕</button>
        </div>
        <div className="p-5 space-y-5 text-sm">
          {hints ? (
            <>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Framework</p>
                <p className="text-gray-200"><span className="font-semibold text-amber-300">Value:</span> {hints.value}</p>
                <p className="text-gray-300"><span className="font-semibold text-amber-300">Criterion:</span> {hints.criterion}</p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Main Arguments</p>
                {hints.arguments.map((arg, i) => (
                  <div key={i} className="rounded-lg bg-gray-800/60 p-3 space-y-2 border border-gray-700/50">
                    <p className="font-semibold text-white">Arg {i + 1}: {arg.claim}</p>
                    <ul className="space-y-1">
                      {arg.talkingPoints.map((pt, j) => (
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
                {hints.counters.map((c, i) => (
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
  );
}

function buildEmailBody(params: {
  resolution: string;
  userSide: "aff" | "neg";
  userName: string;
  feedback: SparFeedbackData;
  aiConstructive: string;
  aiRebuttal: string;
  crossfireQuestions?: string[];
  recordings: { constructive?: Recording; crossfire?: Recording; rebuttal?: Recording };
  hints: PrepHints | null;
  cfSuggestions: CfSuggestions | null;
}): string {
  const { resolution, userSide, userName, feedback, aiConstructive, aiRebuttal, crossfireQuestions, recordings, hints, cfSuggestions } = params;
  const userSideLabel = userSide === "aff" ? "Affirmative" : "Negative";
  const aiSideLabel = userSide === "aff" ? "Negative" : "Affirmative";

  const lines: string[] = [
    `SPAR DEBATE SUMMARY`,
    `===================`,
    ``,
    `Resolution: ${resolution}`,
    `${userName}: ${userSideLabel} | AI: ${aiSideLabel}`,
    `Overall Score: ${feedback.overall_score.toFixed(1)} / 10`,
    ``,
    feedback.overall_summary,
    ``,
    `---`,
    `SCORES`,
    `---`,
    `Constructive: ${feedback.constructive.score.toFixed(1)} / 10`,
    `Cross-Fire:   ${feedback.crossfire.score.toFixed(1)} / 10`,
    `Rebuttal:     ${feedback.rebuttal.score.toFixed(1)} / 10`,
    ``,
  ];

  if (hints) {
    lines.push(`---`, `AI HINTS (Your ${userSideLabel} Position)`, `---`);
    lines.push(`Value: ${hints.value}`);
    lines.push(`Criterion: ${hints.criterion}`);
    lines.push(``);
    hints.arguments.forEach((arg, i) => {
      lines.push(`Argument ${i + 1}: ${arg.claim}`);
      arg.talkingPoints.forEach(pt => lines.push(`  • ${pt}`));
      lines.push(`  Significance: ${arg.significance}`);
      lines.push(``);
    });
    lines.push(`Counter-Arguments:`);
    hints.counters.forEach(c => {
      lines.push(`  They may argue: "${c.theyArgue}"`);
      lines.push(`  Your rebuttal: ${c.yourRebuttal}`);
      lines.push(``);
    });
  }

  lines.push(`---`, `${userName.toUpperCase()}'S SPEECHES`, `---`);

  if (recordings.constructive?.transcript) {
    lines.push(`Constructive Speech:`, recordings.constructive.transcript, ``);
  }
  if (recordings.crossfire?.transcript) {
    lines.push(`Crossfire:`, recordings.crossfire.transcript, ``);
  }
  if (recordings.rebuttal?.transcript) {
    lines.push(`Rebuttal:`, recordings.rebuttal.transcript, ``);
  }

  lines.push(`---`, `AI OPPONENT'S SPEECHES`, `---`);
  lines.push(`AI Constructive:`, aiConstructive, ``);
  lines.push(`AI Rebuttal:`, aiRebuttal, ``);

  if (crossfireQuestions?.length) {
    lines.push(`---`, `AI CROSSFIRE QUESTIONS`, `---`);
    crossfireQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push(``);
  }

  if (cfSuggestions) {
    if (cfSuggestions.questions.length) {
      lines.push(`---`, `SUGGESTED QUESTIONS YOU COULD HAVE ASKED`, `---`);
      cfSuggestions.questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
      lines.push(``);
    }
    if (cfSuggestions.answers.length) {
      lines.push(`---`, `SUGGESTED ANSWERS TO AI'S CROSSFIRE QUESTIONS`, `---`);
      cfSuggestions.answers.forEach((answers, qi) => {
        if (!answers?.length) return;
        lines.push(`Q${qi + 1}: ${crossfireQuestions?.[qi] ?? ""}`);
        answers.forEach((a, i) => lines.push(`  Option ${i + 1}: ${a}`));
        lines.push(``);
      });
    }
  }

  lines.push(`---`, `FEEDBACK`, `---`);
  lines.push(`Constructive: ${feedback.constructive.feedback}`, ``);
  lines.push(`Cross-Fire: ${feedback.crossfire.feedback}`, ``);
  lines.push(`Rebuttal: ${feedback.rebuttal.feedback}`, ``);

  lines.push(`Strengths:`);
  feedback.strengths.forEach(s => lines.push(`  ✓ ${s}`));
  lines.push(``);

  lines.push(`Areas for Improvement:`);
  feedback.improvements.forEach(imp => {
    lines.push(`  [${imp.aspect}] ${imp.issue}`);
    lines.push(`  → ${imp.suggestion}`);
    lines.push(``);
  });

  return lines.join("\n");
}

export default function SparFeedbackReport({
  feedback, resolution, userSide, userName, recordings, aiConstructive, aiRebuttal, crossfireQuestions, hints, cfSuggestions, onReset,
}: SparFeedbackReportProps) {
  const [hintsOpen, setHintsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<"sent" | "error" | null>(null);

  async function handleSendEmail() {
    setEmailSending(true);
    setEmailResult(null);
    try {
      const body = buildEmailBody({
        resolution, userSide, userName, feedback, aiConstructive, aiRebuttal, crossfireQuestions, recordings, hints, cfSuggestions,
      });
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: emailAddress,
          subject: `SPAR Debate Summary — ${resolution.slice(0, 60)}`,
          text: body,
        }),
      });
      setEmailResult(res.ok ? "sent" : "error");
      if (res.ok) setTimeout(() => setEmailOpen(false), 1200);
    } catch {
      setEmailResult("error");
    } finally {
      setEmailSending(false);
    }
  }

  const hintsButton = hints ? (
    <button
      onClick={() => setHintsOpen(true)}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/50 text-amber-300 text-xs font-medium transition-colors"
    >
      💡 Hints
    </button>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <p className="text-gray-500 text-xs uppercase tracking-wider">Resolution</p>
        <p className="text-gray-300 text-sm leading-relaxed">{resolution}</p>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
          userSide === "aff"
            ? "bg-green-900 text-green-300 border border-green-700"
            : "bg-red-900 text-red-300 border border-red-700"
        }`}>
          {userName} — {userSide === "aff" ? "Affirmative" : "Negative"}
        </span>
        <ScoreDial score={feedback.overall_score} />
        <p className="text-gray-300 text-base leading-relaxed mt-2">{feedback.overall_summary}</p>
      </div>

      {/* Phase overview bars */}
      <div className="border border-gray-700 rounded-xl p-5 bg-gray-800/40 space-y-4">
        <h3 className="font-semibold text-white text-sm uppercase tracking-wide">Phase Scores</h3>
        <PhaseBar label="Constructive Speech" score={feedback.constructive.score} />
        <PhaseBar label="Cross-Fire" score={feedback.crossfire.score} />
        <PhaseBar label="Rebuttal" score={feedback.rebuttal.score} />
      </div>

      {/* Constructive — hints button in header */}
      <Collapsible
        title={`Constructive Speech — ${feedback.constructive.score.toFixed(1)}`}
        headerRight={hintsButton}
      >
        <div className="space-y-4">
          {feedback.constructive.ratings && (
            <div className="space-y-2 pb-3 border-b border-gray-700/50">
              <CriterionBar label="Content" score={feedback.constructive.ratings.content} />
              <CriterionBar label="Structure" score={feedback.constructive.ratings.structure} />
              <CriterionBar label="Delivery" score={feedback.constructive.ratings.delivery} />
            </div>
          )}
          <p className="text-gray-300 text-sm leading-relaxed">{feedback.constructive.feedback}</p>
          <RecordingFooter recording={recordings.constructive} />
        </div>
      </Collapsible>

      {/* Crossfire */}
      <Collapsible title={`Cross-Fire — ${feedback.crossfire.score.toFixed(1)}`}>
        <div className="space-y-4">
          {feedback.crossfire.ratings && (
            <div className="space-y-2 pb-3 border-b border-gray-700/50">
              <CriterionBar label="Cross-Examination" score={feedback.crossfire.ratings.cross_examination} />
              <CriterionBar label="Delivery" score={feedback.crossfire.ratings.delivery} />
            </div>
          )}
          <p className="text-gray-300 text-sm leading-relaxed">{feedback.crossfire.feedback}</p>
          {crossfireQuestions?.length ? (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">AI crossfire questions</summary>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                {crossfireQuestions.map((q, i) => (
                  <li key={i} className="text-gray-400 text-xs leading-relaxed">{q}</li>
                ))}
              </ol>
            </details>
          ) : null}
          <RecordingFooter recording={recordings.crossfire} />
        </div>
      </Collapsible>

      {/* Rebuttal */}
      <Collapsible title={`Rebuttal — ${feedback.rebuttal.score.toFixed(1)}`}>
        <div className="space-y-4">
          {feedback.rebuttal.ratings && (
            <div className="space-y-2 pb-3 border-b border-gray-700/50">
              <CriterionBar label="Content" score={feedback.rebuttal.ratings.content} />
              <CriterionBar label="Refutation" score={feedback.rebuttal.ratings.refutation} />
              <CriterionBar label="Delivery" score={feedback.rebuttal.ratings.delivery} />
            </div>
          )}
          <p className="text-gray-300 text-sm leading-relaxed">{feedback.rebuttal.feedback}</p>
          <RecordingFooter recording={recordings.rebuttal} />
        </div>
      </Collapsible>

      {/* Strengths */}
      <Collapsible title="Strengths">
        <ul className="space-y-2">
          {feedback.strengths.map((s, i) => (
            <li key={i} className="flex gap-2 text-gray-300">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="text-sm">{s}</span>
            </li>
          ))}
        </ul>
      </Collapsible>

      {/* Improvements */}
      <Collapsible title="Areas for Improvement">
        <div className="space-y-4">
          {feedback.improvements.map((imp, i) => (
            <div key={i} className="bg-gray-800/60 rounded-lg p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">{imp.aspect}</span>
              <p className="text-red-400 text-sm">{imp.issue}</p>
              <p className="text-gray-300 text-sm">
                <span className="font-semibold text-blue-300">Suggestion: </span>
                {imp.suggestion}
              </p>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* AI speeches for reference */}
      <Collapsible title="AI Opponent's Speeches">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Constructive</p>
            <div className="space-y-3">
              {aiConstructive.split(/\n\n+/).filter(Boolean).map((p, i) => (
                <p key={i} className="text-gray-300 text-sm leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rebuttal</p>
            <div className="space-y-3">
              {aiRebuttal.split(/\n\n+/).filter(Boolean).map((p, i) => (
                <p key={i} className="text-gray-300 text-sm leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
        </div>
      </Collapsible>

      {/* CF Suggestions — only when pre-generated data is available */}
      {cfSuggestions && (
        <Collapsible title="Crossfire Study Guide" defaultOpen={true}>
          <div className="space-y-5">
            {cfSuggestions.questions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">Questions You Could Have Asked</p>
                {cfSuggestions.questions.map((q, i) => (
                  <div key={i} className="rounded-lg bg-gray-800/60 px-3 py-2 text-sm text-gray-200 border border-gray-700/50">
                    <span className="text-purple-400 font-bold mr-1">{i + 1}.</span>{q}
                  </div>
                ))}
              </div>
            )}
            {cfSuggestions.answers.some(a => a?.length) && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">Suggested Answers to AI&rsquo;s Questions</p>
                {(crossfireQuestions ?? []).map((q, qi) => {
                  const answers = cfSuggestions.answers[qi];
                  if (!answers?.length) return null;
                  return (
                    <div key={qi} className="space-y-2">
                      <p className="text-xs text-gray-400 italic">&ldquo;{q}&rdquo;</p>
                      {answers.map((a, i) => (
                        <div key={i} className="rounded-lg bg-gray-800/60 px-3 py-2 text-sm text-gray-200 border border-gray-700/50">
                          <span className="text-purple-400 font-bold mr-1">Option {i + 1}:</span>{a}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
        >
          Debate Again
        </button>
        <Link
          href="/"
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors text-center"
        >
          Home
        </Link>
        <button
          onClick={() => { setEmailOpen(true); setEmailResult(null); }}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
        >
          Email Summary
        </button>
      </div>

      {/* Hints modal */}
      <HintsModal
        open={hintsOpen}
        onClose={() => setHintsOpen(false)}
        hints={hints ?? null}
        resolution={resolution}
        userSide={userSide}
      />

      {/* Email modal */}
      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEmailOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Email Debate Summary</h3>
              <button onClick={() => setEmailOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Sends all speeches, AI hints, crossfire questions, and feedback to the address below.
            </p>
            <input
              type="email"
              value={emailAddress}
              onChange={e => { setEmailAddress(e.target.value); setEmailResult(null); }}
              placeholder="recipient@example.com"
              className="w-full rounded-xl bg-gray-800 border border-gray-600 text-gray-200 text-sm px-4 py-3 focus:outline-none focus:border-gray-400"
              autoFocus
            />
            {emailResult === "sent" && (
              <p className="text-green-400 text-sm text-center">Sent successfully!</p>
            )}
            {emailResult === "error" && (
              <p className="text-red-400 text-sm text-center">Failed to send. Check the address and try again.</p>
            )}
            <button
              onClick={handleSendEmail}
              disabled={!emailAddress.trim() || emailSending}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {emailSending
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending…</>
                : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
