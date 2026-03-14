// Shared LLM fixture helper.
// In each test file, declare the mock at module scope:
//   vi.mock('@/lib/llm', () => ({ callLLM: vi.fn() }))
//   import { callLLM } from '@/lib/llm'
// Then per-test: vi.mocked(callLLM).mockResolvedValueOnce(llmJson({ score: 8 }))

export function llmJson(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}
