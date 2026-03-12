import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { tmpdir } from "os";

const FFMPEG_BIN = process.env.FFMPEG_BIN ?? "/opt/homebrew/bin/ffmpeg";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const STT_PROVIDER = process.env.STT_PROVIDER ?? "groq";
const WHISPER_BIN = process.env.WHISPER_BIN ?? "/opt/homebrew/bin/whisper-cli";
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? "/usr/local/share/whisper/ggml-base.bin";

const RECORDINGS_DIR = join(process.cwd(), "public", "recordings");
const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `Process exited with code ${code}`));
    });
  });
}

async function cleanupOldRecordings() {
  try {
    const files = await readdir(RECORDINGS_DIR);
    const now = Date.now();
    await Promise.all(
      files
        .filter((f) => f.endsWith(".mp3"))
        .map(async (f) => {
          const filePath = join(RECORDINGS_DIR, f);
          const { mtimeMs } = await stat(filePath);
          if (now - mtimeMs > TTL_MS) await unlink(filePath);
        })
    );
  } catch {
    // best-effort
  }
}

async function transcribeGroq(mp3Path: string): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
  const { readFile } = await import("fs/promises");
  const audioBuffer = await readFile(mp3Path);
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.mp3");
  formData.append("model", "whisper-large-v3");
  formData.append("language", "en");
  formData.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Groq error ${res.status}`);
  }

  const data = await res.json() as { text: string };
  return data.text.trim();
}

async function transcribeWhisper(wavPath: string): Promise<string> {
  const { stdout } = await run(WHISPER_BIN, [
    "-m", WHISPER_MODEL,
    "-f", wavPath,
    "--language", "auto",
    "--output-txt",
    "--no-prints",
  ]);
  return stdout
    .split("\n")
    .map((l) => l.replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]\s*/g, "").trim())
    .filter(Boolean)
    .join(" ");
}

export async function POST(req: NextRequest) {
  if (!existsSync(RECORDINGS_DIR)) await mkdir(RECORDINGS_DIR, { recursive: true });

  const tmpDir = join(tmpdir(), "speech-judge");
  if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true });

  const id = Date.now();
  const mp3Path = join(RECORDINGS_DIR, `${id}.mp3`);
  const wavPath = join(tmpDir, `${id}.wav`);

  cleanupOldRecordings();

  let rawAudioPath = join(tmpDir, `${id}-raw.audio`);

  try {
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as File;
    if (!audioBlob) return NextResponse.json({ error: "No audio provided" }, { status: 400 });

    const ext = audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a') ? 'm4a'
      : audioBlob.type.includes('webm') ? 'webm'
      : 'audio';
    rawAudioPath = join(tmpDir, `${id}-raw.${ext}`);

    const buffer = Buffer.from(await audioBlob.arrayBuffer());
    await writeFile(rawAudioPath, buffer);

    let transcript: string;

    if (STT_PROVIDER === "groq") {
      // Convert WebM → MP3 (for playback + Groq)
      await run(FFMPEG_BIN, [
        "-y", "-fflags", "+genpts", "-i", rawAudioPath,
        "-q:a", "4", mp3Path,
      ]);
      transcript = await transcribeGroq(mp3Path);
    } else {
      // Convert audio → MP3 (playback) + WAV (Whisper)
      await run(FFMPEG_BIN, [
        "-y", "-fflags", "+genpts", "-i", rawAudioPath,
        "-q:a", "4", mp3Path,
        "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wavPath,
      ]);
      transcript = await transcribeWhisper(wavPath);
    }

    return NextResponse.json({ transcript, duration_seconds: 0, audioUrl: `/recordings/${id}.mp3` });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    for (const f of [rawAudioPath, wavPath]) {
      try { await unlink(f); } catch {}
    }
  }
}
