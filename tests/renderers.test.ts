import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { renderCheckResults, wrapText } from "../src/ui/renderers.js";
import type { ToolCheckResult } from "../src/ui/renderers.js";

// ---------------------------------------------------------------------------
// wrapText
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// renderCheckResults
// ---------------------------------------------------------------------------

describe("renderCheckResults", () => {
  const okResult: ToolCheckResult = {
    tool: "codex",
    rawPath: "/home/user/.codex/config.toml",
    servers: [
      {
        serverName: "local",
        result: { valid: true, errors: [], warnings: [] },
      },
    ],
  };

  const warnResult: ToolCheckResult = {
    tool: "devin",
    rawPath: "/home/user/.codeium/windsurf/mcp_config.json",
    servers: [
      {
        serverName: "remote",
        result: {
          valid: true,
          errors: [],
          warnings: [
            {
              code: "path_not_found",
              field: "command",
              message: "path does not exist: /tmp/missing",
            },
          ],
        },
      },
    ],
  };

  const errorResult: ToolCheckResult = {
    tool: "vscode",
    rawPath: "/home/user/Library/Application Support/Code/User/settings.json",
    servers: [
      {
        serverName: "bad-server",
        result: {
          valid: false,
          errors: [
            {
              code: "invalid_command",
              field: "command",
              message: "command must be a non-empty string",
            },
          ],
          warnings: [],
        },
      },
    ],
  };

  const emptyResult: ToolCheckResult = {
    tool: "antigravity",
    rawPath: "/home/user/.gemini/config/mcp_config.json",
    servers: [],
  };

  it("includes the tool name in the output", () => {
    const output = renderCheckResults([okResult]);
    expect(output).toContain("Codex");
  });

  it("marks a server as ok when there are no errors or warnings", () => {
    const output = renderCheckResults([okResult]);
    expect(output).toContain("✔");
    expect(output).toContain("local");
  });

  it("marks a server with warnings", () => {
    const output = renderCheckResults([warnResult]);
    expect(output).toContain("⚠");
    expect(output).toContain("remote");
    expect(output).toContain("path does not exist: /tmp/missing");
  });

  it("marks a server with errors", () => {
    const output = renderCheckResults([errorResult]);
    expect(output).toContain("✖");
    expect(output).toContain("bad-server");
    expect(output).toContain("command must be a non-empty string");
  });

  it("shows (no servers to check) for an empty tool", () => {
    const output = renderCheckResults([emptyResult]);
    expect(output).toContain("(no servers to check)");
  });

  it("includes a summary line with correct counts", () => {
    const output = renderCheckResults([okResult, warnResult, errorResult]);
    expect(output).toContain("Summary:");
    expect(output).toContain("1 ok");
    expect(output).toContain("1 warning");
    expect(output).toContain("1 error");
  });
});
