import { NextRequest, NextResponse } from "next/server";
import { topicBank } from "@/lib/topicBank";

export async function POST(req: NextRequest) {
  const { difficulty } = await req.json();
  const pool = topicBank[difficulty as keyof typeof topicBank] ?? topicBank.medium;
  const words = pool[Math.floor(Math.random() * pool.length)];
  return NextResponse.json({ words, topic: words.join(", ") });
}
