import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { tmpdir } from "os";

const WHISPER_BIN = process.env.WHISPER_BIN ?? "/opt/homebrew/bin/whisper-cli";
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? "/usr/local/share/whisper/ggml-base.bin";
const FFMPEG_BIN = process.env.FFMPEG_BIN ?? "/opt/homebrew/bin/ffmpeg";

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
    // best-effort, don't fail the request
  }
}

export async function POST(req: NextRequest) {
  if (!existsSync(RECORDINGS_DIR)) await mkdir(RECORDINGS_DIR, { recursive: true });

  const tmpDir = join(tmpdir(), "speech-judge");
  if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true });

  const id = Date.now();
  const rawWebmPath = join(tmpDir, `${id}-raw.webm`);
  const mp3Path = join(RECORDINGS_DIR, `${id}.mp3`);
  const wavPath = join(tmpDir, `${id}.wav`);

  // Lazy cleanup — run in background, don't await
  cleanupOldRecordings();

  try {
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as File;
    if (!audioBlob) return NextResponse.json({ error: "No audio provided" }, { status: 400 });

    // Save raw WebM to temp (browser MediaRecorder output has bad container headers)
    const buffer = Buffer.from(await audioBlob.arrayBuffer());
    await writeFile(rawWebmPath, buffer);

    // Single ffmpeg pass: produce MP3 for playback + 16kHz WAV for Whisper.
    // -fflags +genpts regenerates timestamps, fixing the non-monotonic DTS
    // caused by MediaRecorder timeslice chunks concatenated into one Blob.
    await run(FFMPEG_BIN, [
      "-y", "-fflags", "+genpts", "-i", rawWebmPath,
      // MP3 for browser playback (native sample rate preserved)
      "-q:a", "4", mp3Path,
      // 16kHz mono WAV for Whisper transcription
      "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wavPath,
    ]);

    // Transcribe with whisper-cli (auto-detect language, works for Chinese and English)
    const { stdout } = await run(WHISPER_BIN, [
      "-m", WHISPER_MODEL,
      "-f", wavPath,
      "--language", "auto",
      "--output-txt",
      "--no-prints",
    ]);

    const transcript = stdout
      .split("\n")
      .map((l) => l.replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]\s*/g, "").trim())
      .filter(Boolean)
      .join(" ");

    return NextResponse.json({ transcript, duration_seconds: 0, audioUrl: `/recordings/${id}.mp3` });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Clean up temp files; MP3 is kept for replay
    for (const f of [rawWebmPath, wavPath]) {
      try { await unlink(f); } catch {}
    }
  }
}
