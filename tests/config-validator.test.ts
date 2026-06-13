import { describe, expect, it } from "vitest";

import { ConfigValidator } from "../src/services/config-validator.js";

describe("ConfigValidator", () => {
  it("reports MVP validation errors and path warnings", async () => {
    const validator = new ConfigValidator({
      homeDir: "/Users/tester",
      pathExists: async (path) => path === "/Users/tester" || path === "/existing/server",
      platform: "darwin",
    });

    const result = await validator.validateServers([
      {
        name: "   ",
        command: "",
        args: ["ok", 42],
        env: { TOKEN: 123 },
        transport: "http",
      },
      {
        name: "filesystem",
        command: "/Users/tester",
        args: ["/missing/path", "/existing/server"],
        env: {},
        transport: "stdio",
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toEqual([
      "invalid_name",
      "invalid_command",
      "invalid_args",
      "invalid_env",
      "unsupported_transport",
    ]);
    expect(result.warnings).toEqual([
      {
        code: "dangerous_path_scope",
        field: "command",
        message: "path looks too broad or risky for an MCP server: /Users/tester",
      },
      {
        code: "path_not_found",
        field: "args[0]",
        message: "absolute path does not exist: /missing/path",
      },
    ]);
  });
});
