import { describe, it, expect, vi } from "vitest";
import { debounce } from "../js/utils/debounce.js";
import { highlightMatches } from "../js/utils/highlight.js";

describe("debounce", () => {
  it("only runs the last call after the wait", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d("a"); d("ab"); d("abc");
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("abc");
    vi.useRealTimers();
  });

  it("supports cancel and flush", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d(1); d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
    d(2); d.flush();
    expect(fn).toHaveBeenCalledWith(2);
    d.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe("highlightMatches", () => {
  it("wraps each matching token, case-insensitively", () => {
    expect(highlightMatches("Paneer Tikka Pizza", "tikka piz")).toBe("Paneer <mark>Tikka</mark> <mark>Piz</mark>za");
  });

  it("escapes HTML in both text and query", () => {
    expect(highlightMatches("<b>Fish & Chips</b>", "<b>")).toBe("<mark>&lt;b&gt;</mark>Fish &amp; Chips&lt;/b&gt;");
  });

  it("treats regex characters in the query literally", () => {
    expect(highlightMatches("Combo (2 pc)", "(2")).toBe("Combo <mark>(2</mark> pc)");
  });
});
