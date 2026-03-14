"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import CountdownTimer from "@/components/CountdownTimer";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPlayer from "@/components/AudioPlayer";
import FeedbackReport from "@/components/FeedbackReport";

type State = "loading" | "thinking" | "recording" | "processing" | "feedback";

interface FeedbackData {
  score: number;
  summary: string;
  strengths: string[];
  improvements: { aspect: string; quote: string; issue: string; suggestion: string }[];
  structure: { intro: string; body: string; conclusion: string };
  vocabulary: string;
  delivery: string;
}

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const difficulty = (searchParams.get("difficulty") ?? "medium") as "easy" | "medium" | "hard";
  const thinkTimeSeconds = Number(searchParams.get("thinkTime") ?? 120);
  const speechLengthSeconds = Number(searchParams.get("speechLength") ?? 300);

  const [state, setState] = useState<State>("loading");
  const [topic, setTopic] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(thinkTimeSeconds);
  const [graceRemaining, setGraceRemaining] = useState(10);
  const [isInGrace, setIsInGrace] = useState(false);
  const [forceStop, setForceStop] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("Transcribing...");
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function generateTopic() {
      try {
        const res = await fetch("/api/generate-topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ difficulty }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `API error ${res.status}`);
        setWords(data.words);
        setTopic(data.topic);
        setRemaining(thinkTimeSeconds);
        if (thinkTimeSeconds === 0) {
          setState("recording");
        } else {
          setState("thinking");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    generateTopic();
  }, [difficulty, thinkTimeSeconds]);

  useEffect(() => {
    if (state !== "thinking") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current!);
          setState("recording");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  useEffect(() => {
    if (state !== "recording") return;
    setRemaining(speechLengthSeconds);
    setGraceRemaining(10);
    setIsInGrace(false);
    setForceStop(false);

    let inGrace = false;
    let graceLeft = 10;

    timerRef.current = setInterval(() => {
      if (!inGrace) {
        setRemaining((r) => {
          if (r <= 1) {
            inGrace = true;
            setIsInGrace(true);
            return 0;
          }
          return r - 1;
        });
      } else {
        graceLeft -= 1;
        setGraceRemaining(graceLeft);
        if (graceLeft <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setForceStop(true);
        }
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, speechLengthSeconds]);

  const startRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState("recording");
  }, []);

  const handleRecordingStop = useCallback(
    async (transcriptText: string, durationSeconds: number, recordingUrl: string) => {
      setTranscript(transcriptText);
      setAudioUrl(recordingUrl);
      setState("processing");
      setProcessingMsg("Analyzing your speech...");
      try {
        const feedbackRes = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, transcript: transcriptText, duration_seconds: durationSeconds, difficulty, speech_length_seconds: speechLengthSeconds }),
        });
        const feedbackData = await feedbackRes.json();
        if (!feedbackRes.ok) throw new Error(feedbackData.error ?? `Feedback failed: ${feedbackRes.status}`);
        setFeedback(feedbackData);
        setState("feedback");

        // Save recording (non-blocking)
        ;(async () => {
          try {
            const form = new FormData();
            form.append("sessionData", JSON.stringify({
              mode: "impromptu", topic, transcript: transcriptText,
              duration_seconds: durationSeconds, difficulty,
              speech_length_seconds: speechLengthSeconds,
              feedback: feedbackData, savedAt: new Date().toISOString(),
            }));
            if (recordingUrl) {
              const blob = await fetch(recordingUrl).then(r => r.blob());
              form.append("audio_speech", blob, "audio_speech.webm");
            }
            await fetch("/api/recording-save", { method: "POST", body: form });
          } catch {}
        })();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [topic, difficulty, speechLengthSeconds]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center gap-6 max-w-lg text-center">
        <p className="text-red-400 font-semibold text-lg">Something went wrong</p>
        <p className="text-gray-400 text-sm font-mono bg-gray-800 p-4 rounded-lg break-all">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Generating your topic...</p>
      </div>
    );
  }

  if (state === "thinking") {
    return (
      <div className="flex flex-col items-center gap-10 w-full max-w-lg">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-widest text-gray-400 font-semibold">
            Your Topic
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {words.map((word, i) => (
              <span key={i} className="text-5xl md:text-7xl font-bold text-white capitalize">
                {word}
              </span>
            ))}
          </div>
        </div>
        <CountdownTimer
          totalSeconds={thinkTimeSeconds}
          remainingSeconds={remaining}
          onComplete={() => setState("recording")}
          onSkip={startRecording}
        />
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-widest text-gray-400">Speaking on</p>
          <p className="text-2xl font-bold text-white">{topic}</p>
        </div>
        {isInGrace ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 absolute" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="54" fill="none" stroke="#ef4444" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 * (1 - graceRemaining / 10)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span className="text-3xl font-mono font-bold text-red-400 animate-pulse">
                {String(graceRemaining).padStart(2, "0")}s
              </span>
            </div>
            <p className="text-red-400 text-sm font-semibold animate-pulse">Wrapping up…</p>
          </div>
        ) : (
          <CountdownTimer
            totalSeconds={speechLengthSeconds}
            remainingSeconds={remaining}
            onComplete={() => {}}
            onSkip={() => {}}
            hideSkip
          />
        )}
        <AudioRecorder onStop={handleRecordingStop} forceStop={forceStop} />
      </div>
    );
  }

  if (state === "processing") {
    return (
      <div className="flex flex-col gap-6 w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-gray-400 text-sm">{processingMsg}</p>
        </div>
        <AudioPlayer audioUrl={audioUrl} />
        {transcript && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">Your Transcript</p>
            <p className="text-gray-200 text-sm leading-relaxed">{transcript}</p>
          </div>
        )}
      </div>
    );
  }

  if (state === "feedback" && feedback) {
    return (
      <FeedbackReport
        feedback={feedback}
        transcript={transcript}
        topic={topic}
        audioUrl={audioUrl}
        onReset={() => router.push("/")}
      />
    );
  }

  return null;
}

export default function SessionPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading...</p>
        </div>
      }>
        <SessionContent />
      </Suspense>
    </main>
  );
}
