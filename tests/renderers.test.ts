import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { wrapText } from "../src/ui/renderers.js";

describe("wrapText", () => {
  let originalColumns: number | undefined;

  beforeEach(() => {
    originalColumns = process.stdout.columns;
  });

  afterEach(() => {
    process.stdout.columns = originalColumns;
  });

  it("does not wrap text if it is shorter than available width", () => {
    process.stdout.columns = 80;
    const text = "npx -y short-cmd";
    const result = wrapText(text, 16);
    expect(result).toBe(text);
  });

  it("wraps text at spaces when it exceeds terminal width", () => {
    process.stdout.columns = 40; // availableWidth = 40 - 16 = 24
    const text = "npx -y mcp-remote@latest http://example.com/api";
    // Words: ["npx", "-y", "mcp-remote@latest", "http://example.com/api"]
    // "npx -y mcp-remote@latest" = 23 chars (fits in 24)
    // "http://example.com/api" = 22 chars
    const result = wrapText(text, 16);
    expect(result).toBe(
      "npx -y mcp-remote@latest\n" +
      "                http://example.com/api"
    );
  });

  it("handles extremely long words by printing them on their own line without breaking", () => {
    process.stdout.columns = 30; // availableWidth = 30 - 16 = 14
    const text = "npx http://example-extremely-long-url-that-exceeds-width.com/api";
    const result = wrapText(text, 16);
    expect(result).toBe(
      "npx\n" +
      "                http://example-extremely-long-url-that-exceeds-width.com/api"
    );
  });
});
