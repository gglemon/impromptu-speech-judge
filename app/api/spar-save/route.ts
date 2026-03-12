import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, stat, rm } from "fs/promises";
import path from "path";
import { auth } from "@/auth";

const SESSIONS_DIR = path.join(process.cwd(), "spar-sessions");
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

async function cleanOldSessions() {
  try {
    const topics = await readdir(SESSIONS_DIR);
    const now = Date.now();
    for (const topic of topics) {
      const topicDir = path.join(SESSIONS_DIR, topic);
      const sessions = await readdir(topicDir);
      for (const session of sessions) {
        const sessionDir = path.join(topicDir, session);
        const info = await stat(sessionDir);
        if (now - info.mtimeMs > TTL_MS) {
          await rm(sessionDir, { recursive: true, force: true });
        }
      }
      // Remove empty topic dirs
      const remaining = await readdir(topicDir);
      if (remaining.length === 0) await rm(topicDir, { recursive: true, force: true });
    }
  } catch {
    // sessions dir may not exist yet
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const formData = await req.formData();

    const sessionDataRaw = formData.get("sessionData");
    if (!sessionDataRaw || typeof sessionDataRaw !== "string") {
      return NextResponse.json({ error: "Missing sessionData" }, { status: 400 });
    }
    const sessionData = JSON.parse(sessionDataRaw);
    const { resolution } = sessionData;

    // Tag with authenticated user if available
    if (session?.user?.email) {
      sessionData.userId = session.user.email;
      sessionData.userName = session.user.name ?? undefined;
    }

    // Build directory path
    const topicSlug = slugify(resolution ?? "unknown-topic");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const sessionDir = path.join(SESSIONS_DIR, topicSlug, timestamp);
    await mkdir(sessionDir, { recursive: true });

    // Save session JSON
    await writeFile(path.join(sessionDir, "session.json"), JSON.stringify(sessionData, null, 2), "utf-8");

    // Save audio files if provided
    const audioFields = ["audio_constructive", "audio_crossfire", "audio_rebuttal"];
    for (const field of audioFields) {
      const file = formData.get(field);
      if (file && file instanceof Blob) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.type.includes("ogg") ? "ogg" : "webm";
        await writeFile(path.join(sessionDir, `${field}.${ext}`), buffer);
      }
    }

    // Cleanup old sessions (async, don't await)
    cleanOldSessions().catch(() => {});

    return NextResponse.json({ saved: true, path: `${topicSlug}/${timestamp}` });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
