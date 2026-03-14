import { describe, it, expect } from "vitest";
import { tongueTwisters, type TongueTwister } from "../tongueTwisters";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

describe("tongueTwisters", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(tongueTwisters)).toBe(true);
    expect(tongueTwisters.length).toBeGreaterThan(0);
  });

  it("every entry has a non-empty text string", () => {
    for (const t of tongueTwisters) {
      expect(typeof t.text).toBe("string");
      expect(t.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry has a valid difficulty", () => {
    for (const t of tongueTwisters) {
      expect(DIFFICULTIES).toContain(t.difficulty);
    }
  });

  it("has all three difficulty levels represented", () => {
    for (const d of DIFFICULTIES) {
      const count = tongueTwisters.filter((t) => t.difficulty === d).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it("has at least 5 twisters per difficulty", () => {
    for (const d of DIFFICULTIES) {
      const count = tongueTwisters.filter((t: TongueTwister) => t.difficulty === d).length;
      expect(count).toBeGreaterThanOrEqual(5);
    }
  });

  it("has no duplicate texts", () => {
    const texts = tongueTwisters.map((t) => t.text);
    const unique = new Set(texts);
    expect(unique.size).toBe(texts.length);
  });

  it("easy twisters are shorter on average than hard twisters", () => {
    const avgLen = (d: "easy" | "medium" | "hard") => {
      const items = tongueTwisters.filter((t) => t.difficulty === d);
      return items.reduce((sum, t) => sum + t.text.length, 0) / items.length;
    };
    expect(avgLen("easy")).toBeLessThan(avgLen("hard"));
  });
});
