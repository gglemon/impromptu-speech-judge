import { describe, it, expect } from "vitest";
import { sparTopics, getTopicsByDifficulty, SparDifficulty } from "../sparTopics";

const DIFFICULTIES: SparDifficulty[] = ["easy", "medium", "hard"];

describe("sparTopics", () => {
  it("has all three difficulty levels", () => {
    for (const d of DIFFICULTIES) {
      expect(sparTopics[d]).toBeDefined();
    }
  });

  it("returns a non-empty array for each difficulty", () => {
    for (const d of DIFFICULTIES) {
      expect(sparTopics[d].length).toBeGreaterThan(0);
    }
  });

  it("contains only non-empty strings", () => {
    for (const d of DIFFICULTIES) {
      for (const topic of sparTopics[d]) {
        expect(typeof topic).toBe("string");
        expect(topic.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("has no duplicate topics within each difficulty", () => {
    for (const d of DIFFICULTIES) {
      const topics = sparTopics[d];
      const unique = new Set(topics);
      expect(unique.size).toBe(topics.length);
    }
  });

  it("has no duplicate topics across difficulties", () => {
    const all = DIFFICULTIES.flatMap(d => sparTopics[d]);
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });

  it("meets minimum topic counts per difficulty", () => {
    expect(sparTopics.easy.length).toBeGreaterThanOrEqual(30);
    expect(sparTopics.medium.length).toBeGreaterThanOrEqual(50);
    expect(sparTopics.hard.length).toBeGreaterThanOrEqual(40);
  });
});

describe("getTopicsByDifficulty", () => {
  it("returns the correct array for each difficulty", () => {
    for (const d of DIFFICULTIES) {
      expect(getTopicsByDifficulty(d)).toBe(sparTopics[d]);
    }
  });

  it("returns the same reference as sparTopics", () => {
    expect(getTopicsByDifficulty("easy")).toStrictEqual(sparTopics.easy);
    expect(getTopicsByDifficulty("medium")).toStrictEqual(sparTopics.medium);
    expect(getTopicsByDifficulty("hard")).toStrictEqual(sparTopics.hard);
  });
});
