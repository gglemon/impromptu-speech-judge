"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import AudioRecorder from "@/components/AudioRecorder";
import CountdownTimer from "@/components/CountdownTimer";
import SparFeedbackReport from "@/components/SparFeedbackReport";
import { getTopicsByDifficulty, type SparDifficulty } from "@/lib/sparTopics";

type Stage = "setup" | "prep" | "speech" | "processing" | "feedback";
type CfSubPhase = "question" | "response";

interface Phase {
  id: string;
  label: string;
  side: "aff" | "neg" | "both";
  seconds: number;
}

const PHASES: Phase[] = [
  { id: "aff_constructive", label: "Affirmative Constructive", side: "aff", seconds: 120 },
  { id: "neg_constructive", label: "Negative Constructive", side: "neg", seconds: 120 },
  { id: "crossfire",        label: "Cross-Fire",             side: "both", seconds: 120 },
  { id: "aff_rebuttal",    label: "Affirmative Rebuttal",    side: "aff", seconds: 120 },
  { id: "neg_rebuttal",    label: "Negative Rebuttal",       side: "neg", seconds: 120 },
];

// Crossfire: 6 exchanges, alternating Aff→Neg→Aff→Neg→Aff→Neg
// Exchange i: questioner = i%2===0 ? "aff" : "neg"
const CF_EXCHANGES = 6;

interface Recording { transcript: string; audioUrl?: string }
interface AiData { ai_constructive: string; ai_rebuttal?: string; aiSide: "aff" | "neg" }
interface SparFeedback {
  overall_score: number; overall_summary: string;
  constructive: { score: number; feedback: string };
  crossfire: { score: number; feedback: string };
  rebuttal: { score: number; feedback: string };
  strengths: string[];
  improvements: { aspect: string; issue: string; suggestion: string }[];
}

// ─── TTS ─────────────────────────────────────────────────────────────────────

function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, []);
  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);
  return { isSpeaking, speak, stop };
}

// ─── Negate resolution ────────────────────────────────────────────────────────

function negateResolution(r: string): string {
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

// ─── Topic banner ─────────────────────────────────────────────────────────────

function TopicBanner({ resolution, userSide }: { resolution: string; userSide: "aff" | "neg" }) {
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

// ─── Play/Stop TTS button ─────────────────────────────────────────────────────

function TtsButton({ text, isSpeaking, onPlay, onStop }: { text: string; isSpeaking: boolean; onPlay: () => void; onStop: () => void }) {
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

function RecorderWithTextFallback({ onSubmit }: { onSubmit: (text: string) => void }) {
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

// ─── Main ─────────────────────────────────────────────────────────────────────

function SpeechBody({ text, className = "text-gray-200" }: { text: string; className?: string }) {
  const paras = text.split(/\n\n+/).filter(Boolean);
  if (paras.length <= 1) {
    // Fall back to single-newline splitting if no double newlines
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

function pickTopicOptions(diff: SparDifficulty): string[] {
  const pool = getTopicsByDifficulty(diff);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function TransitionCountdown({ onDone }: { onDone: () => void }) {
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

export default function SparPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [difficulty, setDifficulty] = useState<SparDifficulty>("medium");
  const [userName, setUserName] = useState("");
  const [userSide, setUserSide] = useState<"aff" | "neg">("aff");
  const [resolution, setResolution] = useState("");
  const [opponentMode, setOpponentMode] = useState<"ai" | "friend">("ai");
  const opponentModeRef = useRef<"ai" | "friend">("ai");

  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const autoPlayAudioRef = useRef(false);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const aiDifficultyRef = useRef<"easy" | "medium" | "hard">("medium");
  const [transitionData, setTransitionData] = useState<{ nextPhaseIdx: number; label: string } | null>(null);
  const userSideRef = useRef<"aff" | "neg">("aff");

  const [topicOptions, setTopicOptions] = useState<string[]>(() => pickTopicOptions("medium"));
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [customTopicOpen, setCustomTopicOpen] = useState(false);
  const [aiData, setAiData] = useState<AiData | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenerateError, setAiGenerateError] = useState("");
  const [aiRebuttalGenerating, setAiRebuttalGenerating] = useState(false);
  const [crossfireQuestions, setCrossfireQuestions] = useState<string[] | null>(null);
  const [crossfireGenerating, setCrossfireGenerating] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(120);
  const [recordings, setRecordings] = useState<{ constructive?: Recording; crossfire?: Recording; rebuttal?: Recording }>({});
  const [feedback, setFeedback] = useState<SparFeedback | null>(null);
  const [error, setError] = useState("");
  const [prepRemaining, setPrepRemaining] = useState(120);
  const [prepPaused, setPrepPaused] = useState(false);
  const prepPausedRef = useRef(false);

  interface PrepHints {
    value: string;
    criterion: string;
    arguments: { claim: string; talkingPoints: string[]; significance: string }[];
    counters: { theyArgue: string; yourRebuttal: string }[];
  }
  const [prepHints, setPrepHints] = useState<PrepHints | null>(null);
  const [prepHintsLoading, setPrepHintsLoading] = useState(false);
  const [prepHintsOpen, setPrepHintsOpen] = useState(false);

  const [userRebuttalHint, setUserRebuttalHint] = useState<string | null>(null);
  const [userRebuttalHintLoading, setUserRebuttalHintLoading] = useState(false);
  const [userRebuttalHintOpen, setUserRebuttalHintOpen] = useState(false);

  // Crossfire exchange state
  const [cfExchangeIdx, setCfExchangeIdx] = useState(0);      // 0–5
  const [cfSubPhase, setCfSubPhase] = useState<CfSubPhase>("question");
  const [cfCurrentQuestion, setCfCurrentQuestion] = useState(""); // question being asked in this exchange
  const [cfAiResponse, setCfAiResponse] = useState("");           // AI-generated response text
  const [cfAiResponseLoading, setCfAiResponseLoading] = useState(false);
  const [cfSuggestions, setCfSuggestions] = useState<string[]>([]);
  const [cfSuggestionsLoading, setCfSuggestionsLoading] = useState(false);
  const [cfSuggestionsOpen, setCfSuggestionsOpen] = useState(false);
  const cfTranscriptsRef = useRef<string[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const crossfireQRef = useRef<string[] | null>(null);
  const aiDataRef = useRef<AiData | null>(null);
  const recordingsRef = useRef<{ constructive?: Recording; crossfire?: Recording; rebuttal?: Recording }>({});
  const resolutionRef = useRef("");
  const difficultyRef = useRef<SparDifficulty>("medium");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { crossfireQRef.current = crossfireQuestions; }, [crossfireQuestions]);
  useEffect(() => { aiDataRef.current = aiData; }, [aiData]);
  useEffect(() => { recordingsRef.current = recordings; }, [recordings]);
  useEffect(() => { resolutionRef.current = resolution; }, [resolution]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { opponentModeRef.current = opponentMode; }, [opponentMode]);
  useEffect(() => { autoPlayAudioRef.current = autoPlayAudio; }, [autoPlayAudio]);
  useEffect(() => { aiDifficultyRef.current = aiDifficulty; }, [aiDifficulty]);
  useEffect(() => { userSideRef.current = userSide; }, [userSide]);

  useEffect(() => {
    const opts = pickTopicOptions(difficulty);
    setTopicOptions(opts);
    setSelectedTopic(opts[0]);
    setCustomTopicOpen(false);
  }, [difficulty]);

  const { isSpeaking, speak, stop } = useTTS();

  // Auto-play AI constructive/rebuttal when entering AI phase
  useEffect(() => {
    if (!autoPlayAudioRef.current || stage !== "speech" || transitionData !== null) return;
    const phase = PHASES[phaseIndex];
    if (phase.side === userSide || phase.id === "crossfire") return;
    const text = phase.id.includes("rebuttal") ? aiData?.ai_rebuttal : aiData?.ai_constructive;
    if (text) speak(text);
  }, [phaseIndex, stage, transitionData, aiData?.ai_constructive, aiData?.ai_rebuttal, userSide, speak]);

  // Auto-play AI crossfire question
  useEffect(() => {
    const currentAiQuestion = crossfireQuestions?.[aiQuestionIdx(cfExchangeIdx)];
    if (!autoPlayAudioRef.current || !currentAiQuestion) return;
    speak(currentAiQuestion);
  }, [crossfireQuestions, cfExchangeIdx, speak]);

  // Auto-play AI crossfire response
  useEffect(() => {
    if (!autoPlayAudioRef.current || !cfAiResponse) return;
    speak(cfAiResponse);
  }, [cfAiResponse, speak]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startPhaseTimer = useCallback((seconds: number) => {
    clearTimer();
    setRemaining(seconds);
    timerRef.current = setInterval(() => {
      setRemaining(prev => { if (prev <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; } return prev - 1; });
    }, 1000);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clearTimer();
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, [clearTimer]);

  const advancePhase = useCallback((nextIndex: number) => {
    stop();
    clearTimer();
    if (nextIndex >= PHASES.length) { setStage("processing"); return; }
    const nextPhase = PHASES[nextIndex];
    if (nextPhase.side === userSideRef.current) {
      // Show 10-second transition countdown before user's turn
      setTransitionData({ nextPhaseIdx: nextIndex, label: nextPhase.label });
    } else {
      setPhaseIndex(nextIndex);
      startPhaseTimer(nextPhase.seconds);
    }
  }, [stop, clearTimer, startPhaseTimer]);

  // Initialize crossfire when entering phase 2
  useEffect(() => {
    if (stage !== "speech" || phaseIndex !== 2) return;
    setCfExchangeIdx(0);
    setCfSubPhase("question");
    setCfCurrentQuestion("");
    setCfAiResponse("");
    setCfSuggestions([]);
    setCfSuggestionsOpen(false);
    cfTranscriptsRef.current = [];
  }, [stage, phaseIndex]);

  // ── Crossfire helpers ──────────────────────────────────────────────────────

  // questioner for exchange i: aff on even, neg on odd
  const exchangeQuestioner = (i: number): "aff" | "neg" => i % 2 === 0 ? "aff" : "neg";
  // AI's question index for a given exchange (AI asks every other exchange)
  const aiQuestionIdx = (i: number): number => Math.floor(i / 2);

  const fetchCfSuggestions = useCallback((mode: "question" | "response", aiQuestion?: string) => {
    const ai = aiDataRef.current;
    const aiSide = ai?.aiSide ?? (userSide === "aff" ? "neg" : "aff");
    setCfSuggestionsLoading(true);
    setCfSuggestions([]);
    setCfSuggestionsOpen(true);
    fetch("/api/spar-cf-suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resolution: resolutionRef.current, userSide, aiSide, aiConstructive: ai?.ai_constructive ?? "", mode, aiQuestion, difficulty: difficultyRef.current }),
    })
      .then(r => r.json())
      .then(d => { if (d.suggestions) setCfSuggestions(d.suggestions); })
      .catch(() => {})
      .finally(() => setCfSuggestionsLoading(false));
  }, [userSide]);

  const resetCfExchange = () => {
    setCfSuggestions([]);
    setCfSuggestionsOpen(false);
    setCfCurrentQuestion("");
    setCfAiResponse("");
  };

  const endCrossfire = useCallback(() => {
    stop();
    const cfTranscript = cfTranscriptsRef.current.join("\n\n");
    setRecordings(prev => ({ ...prev, crossfire: { transcript: cfTranscript } }));
    // Start generating AI rebuttal based on what the user actually said
    const ai = aiDataRef.current;
    if (ai && opponentModeRef.current === "ai") {
      setAiRebuttalGenerating(true);
      fetch("/api/spar-rebuttal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resolution: resolutionRef.current,
          aiSide: ai.aiSide,
          aiConstructive: ai.ai_constructive,
          userConstructive: recordingsRef.current.constructive?.transcript ?? "",
          userCrossfire: cfTranscript,
          difficulty: difficultyRef.current,
          aiDifficulty: aiDifficultyRef.current,
        }),
        signal: abortRef.current?.signal,
      })
        .then(r => r.json())
        .then(d => {
          if (d.ai_rebuttal) {
            setAiData(prev => prev ? { ...prev, ai_rebuttal: d.ai_rebuttal } : prev);
            if (aiDataRef.current) aiDataRef.current = { ...aiDataRef.current, ai_rebuttal: d.ai_rebuttal };
          }
        })
        .catch(() => {})
        .finally(() => setAiRebuttalGenerating(false));
    }
    advancePhase(3);
  }, [stop, advancePhase]);

  // Called when user finishes ASKING their question (question sub-phase)
  const handleUserQuestionDone = useCallback((transcript: string) => {
    cfTranscriptsRef.current.push(`[Q${Math.floor(cfExchangeIdx / 2) + 1}] User asks: ${transcript}`);
    setCfCurrentQuestion(transcript);
    // Generate AI response
    setCfAiResponseLoading(true);
    setCfAiResponse("");
    const ai = aiDataRef.current;
    fetch("/api/spar-cf-respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resolution: resolutionRef.current,
        aiSide: ai?.aiSide,
        aiConstructive: ai?.ai_constructive ?? "",
        question: transcript,
        difficulty: difficultyRef.current,
        aiDifficulty: aiDifficultyRef.current,
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.response) setCfAiResponse(d.response); })
      .catch(() => setCfAiResponse("(Could not generate response)"))
      .finally(() => setCfAiResponseLoading(false));
    setCfSubPhase("response");
  }, [cfExchangeIdx]);

  // Called when user clicks "Ready to respond" after seeing AI's question (question sub-phase)
  const handleReadyToRespond = useCallback(() => {
    stop();
    setCfSubPhase("response");
  }, [stop]);

  // Called when user finishes RESPONDING (response sub-phase, user is responder)
  const handleUserResponseDone = useCallback((transcript: string) => {
    cfTranscriptsRef.current.push(`[Q${Math.floor(cfExchangeIdx / 2) + 1}] User responds: ${transcript}`);
    const next = cfExchangeIdx + 1;
    if (next >= CF_EXCHANGES) { endCrossfire(); return; }
    setCfExchangeIdx(next);
    setCfSubPhase("question");
    resetCfExchange();
  }, [cfExchangeIdx, endCrossfire]);

  // Called when user clicks "Continue" after AI response (response sub-phase, AI is responder)
  const handleAiResponseContinue = useCallback(() => {
    stop();
    const next = cfExchangeIdx + 1;
    if (next >= CF_EXCHANGES) { endCrossfire(); return; }
    setCfExchangeIdx(next);
    setCfSubPhase("question");
    resetCfExchange();
  }, [cfExchangeIdx, endCrossfire, stop]);

  // ── Setup / prep ──────────────────────────────────────────────────────────

  const handleStart = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setError(""); setAiGenerateError("");
    const chosenResolution = selectedTopic || topicOptions[0];
    const randomSide: "aff" | "neg" = Math.random() < 0.5 ? "aff" : "neg";
    const opponentSide: "aff" | "neg" = randomSide === "aff" ? "neg" : "aff";
    setResolution(chosenResolution); resolutionRef.current = chosenResolution;
    setUserSide(randomSide);
    setAiData(null); aiDataRef.current = null;
    setAiGenerating(true);
    setPrepHints(null); setPrepHintsLoading(true); setPrepHintsOpen(false);
    setStage("prep");
    setPrepRemaining(120);
    setPrepPaused(false); prepPausedRef.current = false;
    prepTimerRef.current = setInterval(() => {
      if (prepPausedRef.current) return;
      setPrepRemaining(prev => { if (prev <= 1) { clearInterval(prepTimerRef.current!); prepTimerRef.current = null; return 0; } return prev - 1; });
    }, 1000);
    fetch("/api/spar-prep-hints", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resolution: chosenResolution, userSide: randomSide, difficulty: difficultyRef.current }), signal })
      .then(r => r.json()).then(d => setPrepHints(d)).catch(() => {}).finally(() => setPrepHintsLoading(false));

    if (opponentModeRef.current === "friend") {
      // In friend mode: no AI generation — set placeholder so the rest of the app works
      const placeholder: AiData = { ai_constructive: "", ai_rebuttal: "", aiSide: opponentSide };
      setAiData(placeholder); aiDataRef.current = placeholder;
      setAiGenerating(false);
    } else {
      try {
        const res = await fetch("/api/spar-generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resolution: chosenResolution, userSide: randomSide, difficulty: difficultyRef.current, aiDifficulty: aiDifficultyRef.current }), signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Generation failed");
        setAiData(data); aiDataRef.current = data;
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setAiGenerateError(e instanceof Error ? e.message : "Failed to generate AI speeches");
      } finally { setAiGenerating(false); }
    }
  };

  const startSpeechPhases = useCallback(() => {
    if (prepTimerRef.current) { clearInterval(prepTimerRef.current); prepTimerRef.current = null; }
    stop();
    setStage("speech");
    const firstPhase = PHASES[0];
    if (firstPhase.side === userSideRef.current) {
      setTransitionData({ nextPhaseIdx: 0, label: firstPhase.label });
    } else {
      setPhaseIndex(0);
      startPhaseTimer(firstPhase.seconds);
    }
  }, [stop, startPhaseTimer]);

  // ── Constructive / Rebuttal stop ──────────────────────────────────────────

  const handleUserSpeechStop = useCallback((transcript: string, _dur: number, audioUrl?: string) => {
    const phase = PHASES[phaseIndex];
    const rec: Recording = { transcript, audioUrl };
    setRecordings(prev => {
      if (phase.id === "aff_constructive" || phase.id === "neg_constructive") return { ...prev, constructive: rec };
      if (phase.id === "aff_rebuttal" || phase.id === "neg_rebuttal") return { ...prev, rebuttal: rec };
      return prev;
    });
    if ((phase.id === "aff_constructive" || phase.id === "neg_constructive") && opponentModeRef.current === "ai") {
      setCrossfireGenerating(true); setCrossfireQuestions(null); crossfireQRef.current = null;
      const ai = aiDataRef.current;
      const aiSide = ai?.aiSide ?? (userSide === "aff" ? "neg" : "aff");
      fetch("/api/spar-crossfire", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resolution: resolutionRef.current, aiSide, aiConstructive: ai?.ai_constructive ?? "", userConstructive: transcript, difficulty: difficultyRef.current, aiDifficulty: aiDifficultyRef.current }), signal: abortRef.current?.signal })
        .then(r => r.json()).then(d => { if (d.crossfire_questions) { setCrossfireQuestions(d.crossfire_questions); crossfireQRef.current = d.crossfire_questions; } })
        .catch(() => {}).finally(() => setCrossfireGenerating(false));
    }
    advancePhase(phaseIndex + 1);
  }, [phaseIndex, advancePhase, userSide]);

  const handleAiPhaseNext = useCallback(() => advancePhase(phaseIndex + 1), [phaseIndex, advancePhase]);

  // ── Feedback + session save ───────────────────────────────────────────────

  useEffect(() => {
    if (stage !== "processing" || !aiData) return;
    const go = async () => {
      try {
        const res = await fetch("/api/spar-feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resolution, userSide, userName, aiConstructive: aiData.ai_constructive, aiRebuttal: aiData.ai_rebuttal ?? "", userConstructive: recordings.constructive?.transcript ?? "", userCrossfire: recordings.crossfire?.transcript ?? "", userRebuttal: recordings.rebuttal?.transcript ?? "" }), signal: abortRef.current?.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Feedback failed");
        setFeedback(data); setStage("feedback");
        // Save session (non-blocking)
        const saveSession = async () => {
          const sessionData = { resolution, userSide, userName, aiSide: aiData.aiSide, ai_constructive: aiData.ai_constructive, ai_rebuttal: aiData.ai_rebuttal, crossfire_questions: crossfireQRef.current ?? [], user_constructive: recordings.constructive?.transcript ?? "", user_crossfire: recordings.crossfire?.transcript ?? "", user_rebuttal: recordings.rebuttal?.transcript ?? "", feedback: data, savedAt: new Date().toISOString() };
          const form = new FormData();
          form.append("sessionData", JSON.stringify(sessionData));
          const audioFields: [string, string | undefined][] = [["audio_constructive", recordings.constructive?.audioUrl], ["audio_crossfire", recordings.crossfire?.audioUrl], ["audio_rebuttal", recordings.rebuttal?.audioUrl]];
          await Promise.all(audioFields.map(async ([field, url]) => { if (!url) return; try { const blob = await fetch(url).then(r => r.blob()); form.append(field, blob, `${field}.webm`); } catch { /* expired */ } }));
          await fetch("/api/spar-save", { method: "POST", body: form });
        };
        saveSession().catch(() => {});
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Feedback generation failed"); }
    };
    go();
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    stop(); clearTimer();
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setStage("setup"); setTransitionData(null); setUserName(""); setResolution(""); setAiData(null); aiDataRef.current = null;
    setAiGenerating(false); setAiGenerateError(""); setCrossfireQuestions(null); crossfireQRef.current = null;
    setCrossfireGenerating(false); setPhaseIndex(0); setRemaining(120); setRecordings({});
    setFeedback(null); setError(""); setPrepRemaining(120);
    setPrepPaused(false); prepPausedRef.current = false;
    setPrepHints(null); setPrepHintsLoading(false); setPrepHintsOpen(false);
    setUserRebuttalHint(null); setUserRebuttalHintLoading(false); setUserRebuttalHintOpen(false);
    setCfExchangeIdx(0); setCfSubPhase("question"); setCfCurrentQuestion(""); setCfAiResponse(""); setCfAiResponseLoading(false);
    setCfSuggestions([]); setCfSuggestionsLoading(false); setCfSuggestionsOpen(false);
    cfTranscriptsRef.current = [];
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (stage === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <Link href="/" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">← Back</Link>
            <h1 className="text-3xl font-bold text-white">SPAR Debate</h1>
            <p className="text-gray-400">You&apos;ll be assigned a random topic and side to debate against an AI opponent.</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-300 text-center">Opponent</p>
            <div className="flex rounded-xl overflow-hidden border border-gray-700">
              <button
                onClick={() => setOpponentMode("ai")}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${opponentMode === "ai" ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-400 hover:text-white"}`}
              >
                🤖 vs AI
              </button>
              <button
                onClick={() => setOpponentMode("friend")}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${opponentMode === "friend" ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-400 hover:text-white"}`}
              >
                👥 vs Friend
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-300 text-center">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as SparDifficulty[]).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-colors ${difficulty === d
                    ? d === "easy" ? "bg-green-900 border-green-600 text-green-300"
                      : d === "medium" ? "bg-yellow-900 border-yellow-600 text-yellow-300"
                      : "bg-red-900 border-red-600 text-red-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              {difficulty === "easy" ? "Simple, fun topics — great for 3rd & 4th graders"
                : difficulty === "medium" ? "Reasoning & evidence — 5th & 6th grade level"
                : "Nuanced policy & philosophy — 7th grade and above"}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-300">Pick a topic</p>
              <button
                onClick={() => { setCustomTopicOpen(o => !o); setSelectedTopic(""); }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                + Custom topic
              </button>
            </div>
            {topicOptions.map((topic, i) => (
              <button
                key={i}
                onClick={() => { setSelectedTopic(topic); setCustomTopicOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl border text-base transition-colors ${
                  selectedTopic === topic
                    ? "border-blue-500 bg-blue-900/30 text-white"
                    : "border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-500"
                }`}
              >
                {topic}
              </button>
            ))}
            {customTopicOpen && (
              <input
                type="text"
                placeholder="Type your topic…"
                autoFocus
                onChange={e => setSelectedTopic(e.target.value)}
                value={topicOptions.includes(selectedTopic) ? "" : selectedTopic}
                className="w-full px-4 py-3 rounded-xl border border-blue-600 bg-blue-950/30 text-sm text-gray-200 placeholder-gray-500 focus:outline-none transition-colors"
              />
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-300 text-center">AI Strength</p>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as const).map(d => (
                <button key={d} onClick={() => setAiDifficulty(d)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${aiDifficulty === d
                    ? d === "easy" ? "bg-green-900 border-green-600 text-green-300"
                      : d === "medium" ? "bg-yellow-900 border-yellow-600 text-yellow-300"
                      : "bg-red-900 border-red-600 text-red-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                  {d === "easy" ? "🐣 Weak" : d === "medium" ? "💪 Normal" : "🔥 Strong"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              {aiDifficulty === "easy" ? "AI leaves logical gaps and exploitable flaws for you to catch"
                : aiDifficulty === "medium" ? "AI makes solid, competent arguments"
                : "AI makes the strongest possible case with tight logic"}
            </p>
          </div>

          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-sm font-medium text-gray-300">Auto-play AI audio</p>
              <p className="text-xs text-gray-500">AI speeches play automatically when ready</p>
            </div>
            <button
              onClick={() => setAutoPlayAudio(a => !a)}
              className={`relative w-12 h-6 rounded-full transition-colors ${autoPlayAudio ? "bg-blue-600" : "bg-gray-700"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoPlayAudio ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button onClick={handleStart} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">Start Debate</button>
          <p className="text-center text-xs text-gray-600">Format: Prep → Aff Constructive → Neg Constructive → Crossfire → Aff Rebuttal → Neg Rebuttal</p>
        </div>
      </main>
    );
  }

  if (stage === "prep") {
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
              onClick={() => {
                const next = !prepPaused;
                setPrepPaused(next);
                prepPausedRef.current = next;
              }}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={prepPaused ? "Resume timer" : "Pause timer"}
            >
              <CountdownTimer totalSeconds={120} remainingSeconds={prepRemaining} onComplete={startSpeechPhases} onSkip={startSpeechPhases} hideSkip />
            </button>
            <p className="text-xs text-gray-500">{prepPaused ? "Paused — click to resume" : "Click to pause"}</p>
          </div>

          {/* Bottom row: Start button + compact hints toggle */}
          <div className="flex gap-2">
            <button onClick={startSpeechPhases} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
              Ready — Start Debate →
            </button>
            <button
              onClick={() => setPrepHintsOpen(o => !o)}
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPrepHintsOpen(false)}>
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
                  <button onClick={() => setPrepHintsOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none flex-shrink-0">✕</button>
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
                        {prepHints.arguments.map((arg, i) => (
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
                        {prepHints.counters.map((c, i) => (
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

  if (stage === "speech") {
    // Transition countdown before user's turn
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
            <TransitionCountdown
              onDone={() => {
                setTransitionData(null);
                setPhaseIndex(nextPhaseIdx);
                startPhaseTimer(nextPhase.seconds);
              }}
            />
          </div>
        </main>
      );
    }

    const phase = PHASES[phaseIndex];
    const isUserPhase = phase.side === userSide;
    const aiSpeechText = (phase.id === "aff_rebuttal" || phase.id === "neg_rebuttal") ? aiData?.ai_rebuttal : aiData?.ai_constructive;

    // ── Crossfire: 6 exchanges, 3 questions per side ─────────────────────────
    if (phase.id === "crossfire" && opponentMode === "friend") {
      const questioner = exchangeQuestioner(cfExchangeIdx);
      const responder: "aff" | "neg" = questioner === "aff" ? "neg" : "aff";
      const currentSpeaker = cfSubPhase === "question" ? questioner : responder;
      const exchangeNum = Math.floor(cfExchangeIdx / 2) + 1;
      const isUserSpeaker = currentSpeaker === userSide;
      const speakerLabel = currentSpeaker === "aff" ? "Affirmative" : "Negative";

      const handleFriendCfSubmit = (text: string) => {
        if (cfSubPhase === "question") {
          cfTranscriptsRef.current.push(`[Q${exchangeNum}] ${speakerLabel} asks: ${text}`);
          setCfCurrentQuestion(text);
          setCfSubPhase("response");
        } else {
          const respLabel = responder === "aff" ? "Affirmative" : "Negative";
          cfTranscriptsRef.current.push(`[Q${exchangeNum}] ${respLabel} responds: ${text}`);
          const next = cfExchangeIdx + 1;
          if (next >= CF_EXCHANGES) { endCrossfire(); return; }
          setCfExchangeIdx(next);
          setCfSubPhase("question");
          resetCfExchange();
        }
      };

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
            <RecorderWithTextFallback onSubmit={handleFriendCfSubmit} />
            <button onClick={endCrossfire} className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-gray-700/50 rounded-xl transition-colors">
              Skip Crossfire →
            </button>
          </div>
        </main>
      );
    }

    // ── Crossfire: 6 exchanges, 3 questions per side ─────────────────────────
    if (phase.id === "crossfire") {
      const ai = aiData;
      const aiSide = ai?.aiSide ?? (userSide === "aff" ? "neg" : "aff");
      const questioner = exchangeQuestioner(cfExchangeIdx);
      const isUserQuestioner = questioner === userSide;
      const aiQIdx = aiQuestionIdx(cfExchangeIdx);
      const currentAiQuestion = crossfireQuestions?.[aiQIdx];
      const exchangeNum = Math.floor(cfExchangeIdx / 2) + 1; // 1-3 which question number
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
                  <RecorderWithTextFallback onSubmit={(transcript) => handleUserQuestionDone(transcript)} />
                  <button
                    onClick={() => fetchCfSuggestions("question")}
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
                            onPlay={() => speak(currentAiQuestion!)} onStop={stop} />
                        )}
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        {currentAiQuestion ?? "No question available."}
                      </p>
                    </div>
                  )}
                  <button onClick={handleReadyToRespond} disabled={crossfireGenerating && !currentAiQuestion}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors">
                    Ready to Respond →
                  </button>
                  {currentAiQuestion && (
                    <>
                      <button
                        onClick={() => fetchCfSuggestions("response", currentAiQuestion)}
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
                  <RecorderWithTextFallback onSubmit={(transcript) => handleUserResponseDone(transcript)} />
                  <button
                    onClick={() => fetchCfSuggestions("response", currentAiQuestion)}
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
                          onPlay={() => speak(cfAiResponse)} onStop={stop} />
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
                  <button onClick={handleAiResponseContinue} disabled={cfAiResponseLoading}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors">
                    {cfExchangeIdx >= CF_EXCHANGES - 1 ? "End Crossfire →" : "Next Question →"}
                  </button>
                </div>
              )
            )}

            <button
              onClick={endCrossfire}
              className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-gray-700/50 rounded-xl transition-colors"
            >
              Skip Crossfire →
            </button>
          </div>
        </main>
      );
    }

    // ── Constructive / Rebuttal ───────────────────────────────────────────
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
            onComplete={isUserPhase ? () => {} : handleAiPhaseNext}
            onSkip={isUserPhase ? () => {} : handleAiPhaseNext} hideSkip />
          {isUserPhase ? (
            <div className="space-y-3">
              {(phase.id === "aff_rebuttal" || phase.id === "neg_rebuttal") && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (userRebuttalHint) { setUserRebuttalHintOpen(o => !o); return; }
                      setUserRebuttalHintLoading(true);
                      setUserRebuttalHintOpen(true);
                      fetch("/api/spar-user-rebuttal-hint", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          resolution,
                          userSide,
                          aiConstructive: aiData?.ai_constructive ?? "",
                          userConstructive: recordings.constructive?.transcript ?? "",
                          userCrossfire: recordings.crossfire?.transcript ?? "",
                          difficulty,
                        }),
                        signal: abortRef.current?.signal,
                      })
                        .then(r => r.json())
                        .then(d => { if (d.user_rebuttal_hint) setUserRebuttalHint(d.user_rebuttal_hint); })
                        .catch(() => {})
                        .finally(() => setUserRebuttalHintLoading(false));
                    }}
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
              <RecorderWithTextFallback onSubmit={(text) => handleUserSpeechStop(text, 0)} />
            </div>
          ) : opponentMode === "friend" ? (
            /* Friend records their constructive/rebuttal */
            <div className="space-y-4">
              <div className="rounded-xl border border-purple-800/50 bg-purple-950/30 p-4 text-center">
                <p className="text-purple-300 font-medium text-sm">Pass device to Friend ({userSide === "aff" ? "Negative" : "Affirmative"} side)</p>
                <p className="text-gray-400 text-xs mt-1">Friend records their {phase.id.includes("rebuttal") ? "rebuttal" : "constructive"} speech</p>
              </div>
              <RecorderWithTextFallback onSubmit={(text) => {
                if (phase.id === "aff_constructive" || phase.id === "neg_constructive") {
                  const updated = aiDataRef.current ? { ...aiDataRef.current, ai_constructive: text } : { ai_constructive: text, aiSide: (userSide === "aff" ? "neg" : "aff") as "aff" | "neg" };
                  setAiData(updated); aiDataRef.current = updated;
                } else if (phase.id === "aff_rebuttal" || phase.id === "neg_rebuttal") {
                  const updated = aiDataRef.current ? { ...aiDataRef.current, ai_rebuttal: text } : null;
                  if (updated) { setAiData(updated); aiDataRef.current = updated; }
                }
                advancePhase(phaseIndex + 1);
              }} />
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
                      onPlay={() => speak(aiSpeechText)} onStop={stop} />
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
                onClick={handleAiPhaseNext}
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

  if (stage === "processing") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl space-y-6">
          <TopicBanner resolution={resolution} userSide={userSide} />
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white text-lg font-medium">Analyzing your debate performance...</p>
            <p className="text-gray-400 text-sm">AI is evaluating your speeches</p>
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </div>
        </div>
      </main>
    );
  }

  if (stage === "feedback" && feedback && aiData) {
    return (
      <main className="min-h-screen flex flex-col items-center py-12 px-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center"><h1 className="text-2xl font-bold text-white mb-1">Debate Results</h1></div>
          <SparFeedbackReport feedback={feedback} resolution={resolution} userSide={userSide} userName={userName}
            recordings={recordings} aiConstructive={aiData.ai_constructive} aiRebuttal={aiData.ai_rebuttal ?? ""}
            crossfireQuestions={crossfireQRef.current ?? undefined} hints={prepHints} onReset={handleReset} />
        </div>
      </main>
    );
  }

  return null;
}
