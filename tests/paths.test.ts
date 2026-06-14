import { describe, expect, it } from "vitest";

import { resolveConfigPath } from "../src/utils/paths.js";

describe("resolveConfigPath", () => {
  it("resolves Codex path", () => {
    expect(resolveConfigPath("codex", { homeDir: "/home/tester", platform: "linux" })).toBe(
      "/home/tester/.codex/config.toml",
    );
  });

  it("resolves Antigravity path", () => {
    expect(
      resolveConfigPath("antigravity", { homeDir: "/home/tester", platform: "linux" }),
    ).toBe("/home/tester/.gemini/config/mcp_config.json");
  });

  it("resolves Devin path", () => {
    expect(resolveConfigPath("devin", { homeDir: "/home/tester", platform: "linux" })).toBe(
      "/home/tester/.codeium/windsurf/mcp_config.json",
    );
  });

  it("resolves Codeium JetBrains path", () => {
    expect(
      resolveConfigPath("codeium-jetbrains", { homeDir: "/home/tester", platform: "linux" }),
    ).toBe("/home/tester/.codeium/mcp_config.json");
  });

  it("resolves VSCode path on macOS", () => {
    expect(resolveConfigPath("vscode", { homeDir: "/Users/tester", platform: "darwin" })).toBe(
      "/Users/tester/Library/Application Support/Code/User/settings.json",
    );
  });

  it("resolves VSCode path on Linux", () => {
    expect(resolveConfigPath("vscode", { homeDir: "/home/tester", platform: "linux" })).toBe(
      "/home/tester/.config/Code/User/settings.json",
    );
  });

  it("resolves VSCode path on Windows", () => {
    expect(
      resolveConfigPath("vscode", {
        appDataDir: "C:\\Users\\tester\\AppData\\Roaming",
        homeDir: "C:\\Users\\tester",
        platform: "win32",
      }),
    ).toBe("C:\\Users\\tester\\AppData\\Roaming\\Code\\User\\settings.json");
  });

  it("resolves Devin path on Windows", () => {
    expect(
      resolveConfigPath("devin", {
        homeDir: "C:\\Users\\tester",
        platform: "win32",
      }),
    ).toBe("C:\\Users\\tester\\.codeium\\windsurf\\mcp_config.json");
  });

  it("resolves Codeium JetBrains path on Windows", () => {
    expect(
      resolveConfigPath("codeium-jetbrains", {
        homeDir: "C:\\Users\\tester",
        platform: "win32",
      }),
    ).toBe("C:\\Users\\tester\\.codeium\\mcp_config.json");
  });
});
