import { describe, it, expect } from "vitest";
import { topicBank } from "../topicBank";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

describe("topicBank", () => {
  it("has all three difficulty levels", () => {
    for (const d of DIFFICULTIES) {
      expect(topicBank[d]).toBeDefined();
      expect(Array.isArray(topicBank[d])).toBe(true);
    }
  });

  it("has at least 10 entries per difficulty", () => {
    for (const d of DIFFICULTIES) {
      expect(topicBank[d].length).toBeGreaterThanOrEqual(10);
    }
  });

  it("every entry is an array of non-empty strings", () => {
    for (const d of DIFFICULTIES) {
      for (const entry of topicBank[d]) {
        expect(Array.isArray(entry)).toBe(true);
        expect(entry.length).toBeGreaterThan(0);
        for (const word of entry) {
          expect(typeof word).toBe("string");
          expect(word.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every entry has at least 2 words", () => {
    for (const d of DIFFICULTIES) {
      for (const entry of topicBank[d]) {
        expect(entry.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("has no duplicate word sets within each difficulty", () => {
    for (const d of DIFFICULTIES) {
      const serialized = topicBank[d].map((e) => e.join("|"));
      const unique = new Set(serialized);
      expect(unique.size).toBe(serialized.length);
    }
  });
});
