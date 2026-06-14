export function hasInteractiveInput(): boolean {
  return !!process.stdin.isTTY;
}

export function hasInteractiveOutput(): boolean {
  return !!process.stdout.isTTY;
}

export function canPrompt(): boolean {
  return hasInteractiveInput() && hasInteractiveOutput();
}

export function writeStdout(message = ""): void {
  process.stdout.write(`${message}\n`);
}

export function writeStderr(message = ""): void {
  process.stderr.write(`${message}\n`);
}

export function boldIfInteractiveOutput(value: string): string {
  return hasInteractiveOutput() ? `\u001B[1m${value}\u001B[22m` : value;
}
