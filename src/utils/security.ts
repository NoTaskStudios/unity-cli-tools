/**
 * Redacts sensitive arguments from the command line arguments.
 *
 * @param argv - The array of command line arguments
 * @param sensitiveKeys - The keys that should be redacted
 * @returns - The array of arguments with sensitive information redacted
 * @internal
 */
export function redactSensitiveArgs(
  argv: string[],
  sensitiveKeys: string[] = ["password", "token", "secret"]
): string[] {
  const redacted = [...argv];

  for (let i = 0; i < redacted.length; i++) {
    const arg = redacted[i];

    if (arg.startsWith("--") || arg.startsWith("-")) {
      const key = arg.replace(/^--?/, "");
      if (sensitiveKeys.includes(key.toLowerCase())) {
        if (i + 1 < redacted.length && !redacted[i + 1].startsWith("-")) {
          redacted[i + 1] = "[REDACTED]";
        }
      }
    } else {
      const match = arg.match(/^--?([^=]+)=(.+)$/);
      if (match) {
        const key = match[1];
        if (sensitiveKeys.includes(key.toLowerCase())) {
          redacted[i] = `--${key}=[REDACTED]`;
        }
      }
    }
  }

  return redacted;
}
