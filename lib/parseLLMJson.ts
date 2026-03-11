/**
 * Extracts and parses a JSON object from LLM output that may contain
 * thinking tags, markdown code blocks, or extra surrounding text.
 * Works with DeepSeek (<think> tags), GLM, and other OpenRouter models.
 */
export function parseLLMJson<T = unknown>(text: string): T {
  // Strip thinking tags (DeepSeek, GLM, etc.)
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, "")
    .trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Extract the outermost JSON object or array
  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");

  // Pick whichever valid container comes first
  let jsonStr = cleaned;
  if (objStart !== -1 && objEnd > objStart) {
    if (arrStart !== -1 && arrEnd > arrStart && arrStart < objStart) {
      jsonStr = cleaned.slice(arrStart, arrEnd + 1);
    } else {
      jsonStr = cleaned.slice(objStart, objEnd + 1);
    }
  } else if (arrStart !== -1 && arrEnd > arrStart) {
    jsonStr = cleaned.slice(arrStart, arrEnd + 1);
  }

  // Sanitize control characters inside string values
  const sanitized = jsonStr.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (_, inner: string) =>
      `"${inner.replace(/[\x00-\x1F\x7F]/g, (c: string) => {
        const escapes: Record<string, string> = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
        return escapes[c] ?? "";
      })}"`
  );

  return JSON.parse(sanitized) as T;
}
