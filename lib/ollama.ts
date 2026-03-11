const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "deepseek-r1:latest";

/**
 * Call Ollama with streaming so that aborting the signal actually stops
 * generation server-side (stream: false keeps generating after disconnect).
 */
export async function callOllama(prompt: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      think: true,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Ollama error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line) as { message?: { content?: string } };
        if (json.message?.content) content += json.message.content;
      } catch { /* skip malformed lines */ }
    }
  }

  return content;
}
