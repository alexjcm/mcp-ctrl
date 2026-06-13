import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import * as TOML from "@iarna/toml";
import { describe, expect, it } from "vitest";

import { AntigravityAdapter } from "../src/adapters/antigravity-adapter.js";
import { CodexAdapter } from "../src/adapters/codex-adapter.js";
import { MCPRegistry } from "../src/services/mcp-registry.js";
import { makeBackupService, makeTempDir } from "./test-helpers.js";

describe("MCPRegistry", () => {
  it("adds, updates, removes and lists portable servers without touching extra content", async () => {
    const dir = await makeTempDir("mcp-ctrl-registry");
    const codexPath = join(dir, "codex.toml");
    const geminiPath = join(dir, "gemini.json");

    await writeFile(codexPath, 'model = "gpt-5.4"\n', "utf8");
    await writeFile(geminiPath, JSON.stringify({ theme: "light" }, null, 2), "utf8");

    const registry = new MCPRegistry({
      adapters: {
        codex: new CodexAdapter(await makeBackupService("mcp-ctrl-registry-codex")),
        antigravity: new AntigravityAdapter(await makeBackupService("mcp-ctrl-registry-gemini")),
      },
      paths: {
        codex: codexPath,
        antigravity: geminiPath,
      },
    });

    await registry.add("codex", {
      name: "filesystem",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem"],
      env: {},
    });
    await registry.update("codex", "filesystem", {
      command: "uvx",
      args: ["mcp-server"],
    });
    await registry.add("antigravity", {
      name: "github",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: "secret" },
    });
    await registry.remove("antigravity", "github");

    const [codexConfig] = await registry.list("codex");
    const [geminiConfig] = await registry.list("antigravity");
    const codexDocument = TOML.parse(await readFile(codexPath, "utf8")) as Record<string, unknown>;
    const geminiDocument = JSON.parse(await readFile(geminiPath, "utf8")) as Record<string, unknown>;

    expect(codexConfig.servers).toEqual([
      {
        name: "filesystem",
        command: "uvx",
        args: ["mcp-server"],
        env: {},
      },
    ]);
    expect(geminiConfig.servers).toEqual([]);
    expect(codexDocument.model).toBe("gpt-5.4");
    expect(geminiDocument.theme).toBe("light");
  });
});
