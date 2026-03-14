import { describe, it, expect } from "vitest";
import { parseLLMJson } from "../parseLLMJson";

describe("parseLLMJson", () => {
  describe("plain JSON", () => {
    it("parses a plain JSON object", () => {
      expect(parseLLMJson('{"foo":"bar"}')).toEqual({ foo: "bar" });
    });

    it("parses a JSON object with numbers and arrays", () => {
      expect(parseLLMJson('{"score":8.5,"items":["a","b"]}')).toEqual({
        score: 8.5,
        items: ["a", "b"],
      });
    });

    it("parses a top-level JSON array", () => {
      expect(parseLLMJson('["x","y","z"]')).toEqual(["x", "y", "z"]);
    });
  });

  describe("strips DeepSeek <think> tags", () => {
    it("removes a single <think> block before JSON", () => {
      const input = '<think>I am reasoning about this...</think>\n{"result":"ok"}';
      expect(parseLLMJson(input)).toEqual({ result: "ok" });
    });

    it("removes multiple <think> blocks", () => {
      const input = '<think>step 1</think><think>step 2</think>{"answer":42}';
      expect(parseLLMJson(input)).toEqual({ answer: 42 });
    });

    it("is case-insensitive for think tags", () => {
      const input = '<THINK>ignore me</THINK>{"val":"yes"}';
      expect(parseLLMJson(input)).toEqual({ val: "yes" });
    });

    it("removes [thinking] tags", () => {
      const input = '[thinking]some thoughts[/thinking]{"x":1}';
      expect(parseLLMJson(input)).toEqual({ x: 1 });
    });
  });

  describe("strips markdown code fences", () => {
    it("strips ```json fences", () => {
      const input = "```json\n{\"key\":\"value\"}\n```";
      expect(parseLLMJson(input)).toEqual({ key: "value" });
    });

    it("strips plain ``` fences", () => {
      const input = "```\n{\"key\":\"value\"}\n```";
      expect(parseLLMJson(input)).toEqual({ key: "value" });
    });

    it("handles fences + think tags together", () => {
      const input = '<think>hmm</think>\n```json\n{"done":true}\n```';
      expect(parseLLMJson(input)).toEqual({ done: true });
    });
  });

  describe("extracts JSON from surrounding text", () => {
    it("extracts JSON when preceded by plain text", () => {
      const input = 'Here is the result: {"score":7}';
      expect(parseLLMJson(input)).toEqual({ score: 7 });
    });

    it("extracts JSON when followed by trailing text", () => {
      const input = '{"score":7} That is all.';
      expect(parseLLMJson(input)).toEqual({ score: 7 });
    });

    it("prefers array when it starts before object", () => {
      const input = '["a","b"] and {"x":1}';
      expect(parseLLMJson(input)).toEqual(["a", "b"]);
    });

    it("prefers object when it starts before array", () => {
      const input = '{"x":1} and ["a","b"]';
      expect(parseLLMJson(input)).toEqual({ x: 1 });
    });
  });

  describe("handles control characters in strings", () => {
    it("does not throw on bare newlines inside string values", () => {
      // Raw newline inside a JSON string — normally invalid JSON
      const input = '{"text":"line1\nline2"}';
      expect(() => parseLLMJson(input)).not.toThrow();
      const result = parseLLMJson<{ text: string }>(input);
      expect(result.text).toContain("line1");
      expect(result.text).toContain("line2");
    });

    it("does not throw on bare tabs inside string values", () => {
      const input = '{"text":"col1\tcol2"}';
      expect(() => parseLLMJson(input)).not.toThrow();
      const result = parseLLMJson<{ text: string }>(input);
      expect(result.text).toContain("col1");
      expect(result.text).toContain("col2");
    });
  });

  describe("type parameter", () => {
    it("returns typed result via generic parameter", () => {
      interface MyResult { name: string; score: number }
      const result = parseLLMJson<MyResult>('{"name":"Alice","score":9}');
      expect(result.name).toBe("Alice");
      expect(result.score).toBe(9);
    });
  });

  describe("error cases", () => {
    it("throws when no valid JSON is present", () => {
      expect(() => parseLLMJson("no json here at all")).toThrow();
    });

    it("throws on malformed JSON", () => {
      expect(() => parseLLMJson("{broken")).toThrow();
    });
  });
});
