import { describe, it, expect } from "vitest";
import { casualTopics } from "../casualTopics";

describe("casualTopics", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(casualTopics)).toBe(true);
    expect(casualTopics.length).toBeGreaterThan(0);
  });

  it("has at least 30 topics", () => {
    expect(casualTopics.length).toBeGreaterThanOrEqual(30);
  });

  it("contains only non-empty strings", () => {
    for (const topic of casualTopics) {
      expect(typeof topic).toBe("string");
      expect(topic.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate topics", () => {
    const unique = new Set(casualTopics);
    expect(unique.size).toBe(casualTopics.length);
  });

  it("every topic ends with a letter, digit, or question mark", () => {
    for (const topic of casualTopics) {
      expect(topic.trim()).toMatch(/[\w?]$/);
    }
  });
});
