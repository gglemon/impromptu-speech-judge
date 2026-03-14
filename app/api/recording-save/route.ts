import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, stat, rm } from "fs/promises";
import path from "path";

const RECORDINGS_DIR = path.join(process.cwd(), "recordings");
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

async function cleanOldRecordings(modeDir: string) {
  try {
    const topics = await readdir(modeDir);
    const now = Date.now();
    for (const topic of topics) {
      const topicDir = path.join(modeDir, topic);
      const sessions = await readdir(topicDir);
      for (const session of sessions) {
        const sessionDir = path.join(topicDir, session);
        const info = await stat(sessionDir);
        if (now - info.mtimeMs > TTL_MS) {
          await rm(sessionDir, { recursive: true, force: true });
        }
      }
      const remaining = await readdir(topicDir);
      if (remaining.length === 0) await rm(topicDir, { recursive: true, force: true });
    }
  } catch {
    // dir may not exist yet
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const sessionDataRaw = formData.get("sessionData");
    if (!sessionDataRaw || typeof sessionDataRaw !== "string") {
      return NextResponse.json({ error: "Missing sessionData" }, { status: 400 });
    }
    const sessionData = JSON.parse(sessionDataRaw);
    const { mode, topic } = sessionData;

    if (!mode || !topic) {
      return NextResponse.json({ error: "Missing mode or topic in sessionData" }, { status: 400 });
    }

    const modeDir = path.join(RECORDINGS_DIR, mode);
    const topicSlug = slugify(topic);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const sessionDir = path.join(modeDir, topicSlug, timestamp);
    await mkdir(sessionDir, { recursive: true });

    // Save session JSON
    await writeFile(
      path.join(sessionDir, "session.json"),
      JSON.stringify(sessionData, null, 2),
      "utf-8"
    );

    // Save any audio blobs (fields starting with "audio_")
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("audio_") && value instanceof Blob) {
        const buffer = Buffer.from(await value.arrayBuffer());
        const ext = value.type.includes("ogg") ? "ogg" : "webm";
        await writeFile(path.join(sessionDir, `${key}.${ext}`), buffer);
      }
    }

    // Cleanup old sessions (async, don't await)
    cleanOldRecordings(modeDir).catch(() => {});

    return NextResponse.json({ saved: true, path: `${mode}/${topicSlug}/${timestamp}` });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
