"use client";

import { useEffect, useRef, useState } from "react";

interface AudioRecorderProps {
  onStop: (transcript: string, durationSeconds: number, audioUrl: string) => void;
  forceStop?: boolean;
}

type Stage = "recording" | "transcribing" | "fallback";

export default function AudioRecorder({ onStop, forceStop }: AudioRecorderProps) {
  const [stage, setStage] = useState<Stage>("recording");
  const [elapsed, setElapsed] = useState(0);
  const [manualText, setManualText] = useState("");

  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;
  const stageRef = useRef(stage);
  stageRef.current = stage;

  useEffect(() => {
    let stream: MediaStream;

    async function start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(); // no timeslice — avoids duplicate DTS timestamps in WebM chunks
    }

    start().catch(() => setStage("fallback"));

    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-stop when parent signals grace period expired
  useEffect(() => {
    if (forceStop && stageRef.current === "recording") {
      handleStop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceStop]);

  async function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const duration = (Date.now() - startTimeRef.current) / 1000;

    const recorder = mediaRecorderRef.current;
    if (!recorder) { setStage("fallback"); return; }

    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());

    // Wait for final chunks to flush
    await new Promise((r) => setTimeout(r, 200));

    setStage("transcribing");

    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "speech.webm");

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transcription failed");

      onStopRef.current(data.transcript, duration, data.audioUrl ?? "");
    } catch (e) {
      console.error("Transcription error:", e);
      setStage("fallback");
    }
  }

  function handleManualSubmit() {
    const duration = (Date.now() - startTimeRef.current) / 1000;
    onStopRef.current(manualText.trim(), duration, "");
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (stage === "transcribing") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Transcribing with Whisper...</p>
      </div>
    );
  }

  if (stage === "fallback") {
    return (
      <div className="flex flex-col gap-4 w-full max-w-lg">
        <p className="text-yellow-400 text-sm text-center">
          Transcription failed. Type what you said:
        </p>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Type your speech here..."
          className="w-full h-44 p-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm leading-relaxed resize-none focus:outline-none focus:border-indigo-500"
          autoFocus
        />
        <button
          onClick={handleManualSubmit}
          disabled={!manualText.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors text-lg"
        >
          Get Feedback
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-red-400 font-semibold text-lg">Recording</span>
        <span className="font-mono text-white text-lg">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
      <p className="text-gray-600 text-sm">Speak clearly into your microphone</p>
      <button
        onClick={handleStop}
        className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors text-lg"
      >
        Stop Recording
      </button>
    </div>
  );
}
