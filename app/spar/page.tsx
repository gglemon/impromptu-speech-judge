"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getTopicsByDifficulty, type SparDifficulty } from "@/lib/sparTopics";
import {
  PHASES,
  CF_EXCHANGES,
  type Stage,
  type CfSubPhase,
  type AiData,
  type Recording,
  type SparFeedback,
  type PrepHints,
} from "./components/shared";
import SparSetup from "./components/SparSetup";
import SparPrep from "./components/SparPrep";
import SparSpeech from "./components/SparSpeech";
import SparProcessing from "./components/SparProcessing";
import SparFeedbackStage from "./components/SparFeedbackStage";

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

// ─── Topic helpers ────────────────────────────────────────────────────────────

function pickTopicOptions(diff: SparDifficulty): string[] {
  const pool = getTopicsByDifficulty(diff);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function getStableTopics(diff: SparDifficulty): string[] {
  return pickTopicOptions(diff);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SparPage() {
  const userEmail = "gglemon@gmail.com";
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
  const [preferredSide, setPreferredSide] = useState<"aff" | "neg" | "random">("random");
  const aiDifficultyRef = useRef<"easy" | "medium" | "hard">("medium");
  const [transitionData, setTransitionData] = useState<{ nextPhaseIdx: number; label: string } | null>(null);
  const userSideRef = useRef<"aff" | "neg">("aff");

  const [topicOptions, setTopicOptions] = useState<string[]>([]);
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

  // Read settings from sessionStorage and load topics — runs only on client after mount
  useEffect(() => {
    let diff: SparDifficulty = "medium";
    let opp: "ai" | "friend" = "ai";
    let ai: "easy" | "medium" | "hard" = "medium";
    try {
      const stored = sessionStorage.getItem("spar:settings");
      if (stored) {
        const s = JSON.parse(stored);
        if (s.difficulty === "easy" || s.difficulty === "medium" || s.difficulty === "hard") diff = s.difficulty;
        if (s.opponent === "ai" || s.opponent === "friend") opp = s.opponent;
        if (s.aiDifficulty === "easy" || s.aiDifficulty === "medium" || s.aiDifficulty === "hard") ai = s.aiDifficulty;
      }
    } catch {}

    setDifficulty(diff);
    difficultyRef.current = diff;
    setOpponentMode(opp);
    opponentModeRef.current = opp;
    setAiDifficulty(ai);
    aiDifficultyRef.current = ai;

    const savedTopics = (() => { try { const s = sessionStorage.getItem("spar:topicOptions"); return s ? JSON.parse(s) as string[] : null; } catch { return null; } })();
    const savedSelected = (() => { try { return sessionStorage.getItem("spar:selectedTopic"); } catch { return null; } })();

    const topics = savedTopics ?? getStableTopics(diff);
    if (!savedTopics) { try { sessionStorage.setItem("spar:topicOptions", JSON.stringify(topics)); } catch {} }
    setTopicOptions(topics);
    const initial = savedSelected && topics.includes(savedSelected) ? savedSelected : topics[0];
    setSelectedTopic(initial);
  }, []);

  useEffect(() => { crossfireQRef.current = crossfireQuestions; }, [crossfireQuestions]);
  useEffect(() => { aiDataRef.current = aiData; }, [aiData]);
  useEffect(() => { recordingsRef.current = recordings; }, [recordings]);
  useEffect(() => { resolutionRef.current = resolution; }, [resolution]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { opponentModeRef.current = opponentMode; }, [opponentMode]);
  useEffect(() => { autoPlayAudioRef.current = autoPlayAudio; }, [autoPlayAudio]);
  useEffect(() => { aiDifficultyRef.current = aiDifficulty; }, [aiDifficulty]);
  useEffect(() => { userSideRef.current = userSide; }, [userSide]);


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
    const currentAiQuestion = crossfireQuestions?.[Math.floor(cfExchangeIdx / 2)];
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
    try { sessionStorage.removeItem("spar:topicOptions"); sessionStorage.removeItem("spar:selectedTopic"); } catch {}
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setError(""); setAiGenerateError("");
    const chosenResolution = selectedTopic || topicOptions[0];
    const randomSide: "aff" | "neg" = preferredSide === "random" ? (Math.random() < 0.5 ? "aff" : "neg") : preferredSide;
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

  // ── Friend speech submit ──────────────────────────────────────────────────

  const handleFriendSpeechSubmit = useCallback((text: string) => {
    const phase = PHASES[phaseIndex];
    if (phase.id === "aff_constructive" || phase.id === "neg_constructive") {
      const updated = aiDataRef.current
        ? { ...aiDataRef.current, ai_constructive: text }
        : { ai_constructive: text, aiSide: (userSide === "aff" ? "neg" : "aff") as "aff" | "neg" };
      setAiData(updated); aiDataRef.current = updated;
    } else if (phase.id === "aff_rebuttal" || phase.id === "neg_rebuttal") {
      const updated = aiDataRef.current ? { ...aiDataRef.current, ai_rebuttal: text } : null;
      if (updated) { setAiData(updated); aiDataRef.current = updated; }
    }
    advancePhase(phaseIndex + 1);
  }, [phaseIndex, advancePhase, userSide]);

  // ── Friend crossfire submit ───────────────────────────────────────────────

  const handleFriendCfSubmit = useCallback((text: string) => {
    const questioner = cfExchangeIdx % 2 === 0 ? "aff" : "neg";
    const responder: "aff" | "neg" = questioner === "aff" ? "neg" : "aff";
    const exchangeNum = Math.floor(cfExchangeIdx / 2) + 1;
    const speakerLabel = (cfSubPhase === "question" ? questioner : responder) === "aff" ? "Affirmative" : "Negative";
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
  }, [cfExchangeIdx, cfSubPhase, endCrossfire]);

  // ── Rebuttal hint ─────────────────────────────────────────────────────────

  const handleToggleUserRebuttalHint = useCallback(() => {
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
  }, [userRebuttalHint, resolution, userSide, aiData, recordings, difficulty]);

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
        // Auto-send summary email
        const sendEmail = async () => {
          const userSideLabel = userSide === "aff" ? "Affirmative" : "Negative";
          const aiSideLabel = userSide === "aff" ? "Negative" : "Affirmative";
          const lines = [
            `SPAR DEBATE SUMMARY`,
            `===================`,
            ``,
            `Resolution: ${resolution}`,
            `${userName}: ${userSideLabel} | AI: ${aiSideLabel}`,
            `Overall Score: ${data.overall_score.toFixed(1)} / 10`,
            ``,
            data.overall_summary,
            ``,
            `---`,
            `SCORES`,
            `---`,
            `Constructive: ${data.constructive.score.toFixed(1)} / 10`,
            `Cross-Fire:   ${data.crossfire.score.toFixed(1)} / 10`,
            `Rebuttal:     ${data.rebuttal.score.toFixed(1)} / 10`,
            ``,
            `---`,
            `${userName.toUpperCase()}'S SPEECHES`,
            `---`,
          ];
          if (recordings.constructive?.transcript) lines.push(`Constructive Speech:`, recordings.constructive.transcript, ``);
          if (recordings.crossfire?.transcript) lines.push(`Crossfire:`, recordings.crossfire.transcript, ``);
          if (recordings.rebuttal?.transcript) lines.push(`Rebuttal:`, recordings.rebuttal.transcript, ``);
          lines.push(`---`, `AI OPPONENT'S SPEECHES`, `---`);
          lines.push(`AI Constructive:`, aiData.ai_constructive, ``);
          if (aiData.ai_rebuttal) lines.push(`AI Rebuttal:`, aiData.ai_rebuttal, ``);
          if (crossfireQRef.current?.length) {
            lines.push(`---`, `AI CROSSFIRE QUESTIONS`, `---`);
            crossfireQRef.current.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
            lines.push(``);
          }
          lines.push(`---`, `FEEDBACK`, `---`);
          lines.push(`Constructive: ${data.constructive.feedback}`, ``);
          lines.push(`Cross-Fire: ${data.crossfire.feedback}`, ``);
          lines.push(`Rebuttal: ${data.rebuttal.feedback}`, ``);
          lines.push(`Strengths:`);
          data.strengths.forEach((s: string) => lines.push(`  ✓ ${s}`));
          lines.push(``);
          lines.push(`Areas for Improvement:`);
          data.improvements.forEach((imp: { aspect: string; issue: string; suggestion: string }) => {
            lines.push(`  [${imp.aspect}] ${imp.issue}`);
            lines.push(`  → ${imp.suggestion}`);
            lines.push(``);
          });
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              to: userEmail,
              subject: `SPAR Debate Summary — ${resolution.slice(0, 60)}`,              text: lines.join("\n"),
            }),
          });
        };
        sendEmail().catch(() => {});
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
      <SparSetup
        topicOptions={topicOptions}
        selectedTopic={selectedTopic}
        customTopicOpen={customTopicOpen}
        preferredSide={preferredSide}
        autoPlayAudio={autoPlayAudio}
        error={error}
        onSetPreferredSide={setPreferredSide}
        onSelectTopic={(topic) => {
          setSelectedTopic(topic);
          setCustomTopicOpen(false);
          try { sessionStorage.setItem("spar:selectedTopic", topic); } catch {}
        }}
        onToggleCustomTopic={() => {
          setCustomTopicOpen(o => !o);
          setSelectedTopic("");
          try { sessionStorage.removeItem("spar:selectedTopic"); } catch {}
        }}
        onCustomTopicChange={(value) => {
          setSelectedTopic(value);
          try { sessionStorage.setItem("spar:selectedTopic", value); } catch {}
        }}
        onToggleAutoPlay={() => setAutoPlayAudio(a => !a)}
        onStart={handleStart}
      />
    );
  }

  if (stage === "prep") {
    return (
      <SparPrep
        resolution={resolution}
        userSide={userSide}
        opponentMode={opponentMode}
        aiGenerating={aiGenerating}
        aiGenerateError={aiGenerateError}
        aiData={aiData}
        prepRemaining={prepRemaining}
        prepPaused={prepPaused}
        prepHints={prepHints}
        prepHintsLoading={prepHintsLoading}
        prepHintsOpen={prepHintsOpen}
        onTogglePause={() => {
          const next = !prepPaused;
          setPrepPaused(next);
          prepPausedRef.current = next;
        }}
        onStartSpeechPhases={startSpeechPhases}
        onToggleHints={() => setPrepHintsOpen(o => !o)}
        onCloseHints={() => setPrepHintsOpen(false)}
      />
    );
  }

  if (stage === "speech") {
    return (
      <SparSpeech
        resolution={resolution}
        userSide={userSide}
        opponentMode={opponentMode}
        phaseIndex={phaseIndex}
        remaining={remaining}
        transitionData={transitionData}
        aiData={aiData}
        aiGenerateError={aiGenerateError}
        aiRebuttalGenerating={aiRebuttalGenerating}
        recordings={recordings}
        cfExchangeIdx={cfExchangeIdx}
        cfSubPhase={cfSubPhase}
        cfCurrentQuestion={cfCurrentQuestion}
        cfAiResponse={cfAiResponse}
        cfAiResponseLoading={cfAiResponseLoading}
        cfSuggestions={cfSuggestions}
        cfSuggestionsLoading={cfSuggestionsLoading}
        cfSuggestionsOpen={cfSuggestionsOpen}
        crossfireQuestions={crossfireQuestions}
        crossfireGenerating={crossfireGenerating}
        userRebuttalHint={userRebuttalHint}
        userRebuttalHintLoading={userRebuttalHintLoading}
        userRebuttalHintOpen={userRebuttalHintOpen}
        isSpeaking={isSpeaking}
        difficulty={difficulty}
        onTransitionDone={(nextPhaseIdx) => {
          setTransitionData(null);
          setPhaseIndex(nextPhaseIdx);
          startPhaseTimer(PHASES[nextPhaseIdx].seconds);
        }}
        onUserSpeechStop={handleUserSpeechStop}
        onAiPhaseNext={handleAiPhaseNext}
        onEndCrossfire={endCrossfire}
        onUserQuestionDone={handleUserQuestionDone}
        onReadyToRespond={handleReadyToRespond}
        onUserResponseDone={handleUserResponseDone}
        onAiResponseContinue={handleAiResponseContinue}
        onFetchCfSuggestions={fetchCfSuggestions}
        onFriendCfSubmit={handleFriendCfSubmit}
        onFriendSpeechSubmit={handleFriendSpeechSubmit}
        onToggleUserRebuttalHint={handleToggleUserRebuttalHint}
        onSpeak={speak}
        onStop={stop}
      />
    );
  }

  if (stage === "processing") {
    return (
      <SparProcessing
        resolution={resolution}
        userSide={userSide}
        error={error}
      />
    );
  }

  if (stage === "feedback" && feedback && aiData) {
    return (
      <SparFeedbackStage
        feedback={feedback}
        resolution={resolution}
        userSide={userSide}
        userName={userName}
        recordings={recordings}
        aiData={aiData}
        crossfireQuestions={crossfireQRef.current ?? undefined}
        prepHints={prepHints}
        onReset={handleReset}
      />
    );
  }

  return null;
}
