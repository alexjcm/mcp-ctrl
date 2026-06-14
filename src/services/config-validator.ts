import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, posix, win32 } from "node:path";

import type { ValidationIssue, ValidationResult } from "../types/mcp.types.js";

export interface ConfigValidatorOptions {
  homeDir?: string;
  pathExists?: (path: string) => Promise<boolean>;
  platform?: NodeJS.Platform;
}

export interface ValidateServerInput {
  name?: unknown;
  command?: unknown;
  args?: unknown;
  env?: unknown;
  transport?: unknown;
}

export class ConfigValidator {
  private readonly homeDir: string;
  private readonly pathExists: (path: string) => Promise<boolean>;
  private readonly platform: NodeJS.Platform;

  constructor(options: ConfigValidatorOptions = {}) {
    this.homeDir = options.homeDir ?? homedir();
    this.pathExists = options.pathExists ?? defaultPathExists;
    this.platform = options.platform ?? process.platform;
  }

  async validateServer(input: ValidateServerInput): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    this.validateRequiredString(input.name, "name", errors);
    const command = this.validateRequiredString(input.command, "command", errors);
    const args = this.validateArgs(input.args, errors);
    this.validateEnv(input.env, errors);

    if (input.transport !== undefined && input.transport !== "stdio") {
      errors.push({
        code: "unsupported_transport",
        field: "transport",
        message: "only stdio transport is supported in the MVP",
      });
    }

    if (command) {
      await this.collectPathWarnings("command", command, warnings);
    }

    for (const [index, arg] of args.entries()) {
      await this.collectPathWarnings(`args[${index}]`, arg, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateServers(inputs: ValidateServerInput[]): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const input of inputs) {
      const result = await this.validateServer(input);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateRequiredString(
    value: unknown,
    field: "name" | "command",
    errors: ValidationIssue[],
  ): string | undefined {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push({
        code: `invalid_${field}`,
        field,
        message: `${field} must be a non-empty string`,
      });
      return undefined;
    }

    return value;
  }

  private validateArgs(value: unknown, errors: ValidationIssue[]): string[] {
    if (value === undefined) {
      return [];
    }

    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
      errors.push({
        code: "invalid_args",
        field: "args",
        message: "args must be an array of strings",
      });
      return [];
    }

    return [...value];
  }

  private validateEnv(value: unknown, errors: ValidationIssue[]): Record<string, string> {
    if (value === undefined) {
      return {};
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors.push({
        code: "invalid_env",
        field: "env",
        message: "env must be an object with string values",
      });
      return {};
    }

    const envEntries = Object.entries(value);
    if (envEntries.some(([, item]) => typeof item !== "string")) {
      errors.push({
        code: "invalid_env",
        field: "env",
        message: "env must be an object with string values",
      });
      return {};
    }

    return Object.fromEntries(envEntries) as Record<string, string>;
  }

  private async collectPathWarnings(
    field: string,
    value: string,
    warnings: ValidationIssue[],
  ): Promise<void> {
    if (!isAbsolute(value)) {
      return;
    }

    if (!(await this.pathExists(value))) {
      warnings.push({
        code: "path_not_found",
        field,
        message: `absolute path does not exist: ${value}`,
      });
    }

    if (isDangerousScope(value, this.platform, this.homeDir)) {
      warnings.push({
        code: "dangerous_path_scope",
        field,
        message: `path looks too broad or risky for an MCP server: ${value}`,
      });
    }
  }
}

async function defaultPathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isDangerousScope(
  pathValue: string,
  platform: NodeJS.Platform,
  homeDir: string,
): boolean {
  if (platform === "win32") {
    const normalizedPath = normalizeWindowsPath(pathValue);
    const normalizedHome = normalizeWindowsPath(homeDir);
    const root = win32.parse(normalizedPath).root.toLowerCase();
    const broadUsers = normalizeWindowsPath(win32.join(root, "Users"));

    return (
      normalizedPath === root ||
      normalizedPath === normalizedHome ||
      normalizedPath === broadUsers
    );
  }

  const normalizedPath = posix.normalize(pathValue);
  const normalizedHome = posix.normalize(homeDir);

  return (
    normalizedPath === "/" ||
    normalizedPath === normalizedHome ||
    normalizedPath === "/Users" ||
    normalizedPath === "/home"
  );
}

function normalizeWindowsPath(pathValue: string): string {
  return win32.normalize(pathValue).replace(/[\\]+$/, "").toLowerCase();
}
