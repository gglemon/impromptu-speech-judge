import { callOllama } from "./ollama";
import { callOpenRouter } from "./openrouter";

/**
 * Unified LLM caller. Set LLM_PROVIDER=openrouter in .env.local to use
 * OpenRouter (requires OPENROUTER_API_KEY and optionally OPENROUTER_MODEL).
 * Defaults to local Ollama/deepseek.
 */
export async function callLLM(prompt: string, signal?: AbortSignal): Promise<string> {
  const provider = process.env.LLM_PROVIDER ?? "ollama";
  if (provider === "openrouter") {
    return callOpenRouter(prompt, signal);
  }
  return callOllama(prompt, signal);
}
