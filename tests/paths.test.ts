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
});
