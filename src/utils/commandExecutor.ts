import { Options, execa } from "execa";

export interface CommandOptions extends Options {
  reject?: boolean;
  timeout?: number;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  env?: Record<string, string>;
  cwd?: string;
}

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode?: number;
}

export async function executeCommand(
  executable: string,
  args: string[],
  options: CommandOptions = {}
): Promise<CommandResult> {
  try {
    const streamOutput = options.onStdout || options.onStderr;

    const subprocess = execa(executable, args, {
      reject: options.reject ?? false,
      timeout: options.timeout,
      env: options.env,
      cwd: options.cwd,
      encoding: "utf8",
      buffer: !streamOutput,
    });

    if (streamOutput) {
      if (subprocess.stdout) {
        subprocess.stdout.on("data", (data: Buffer) => {
          const lines = data.toString().split(/\r?\n/);
          for (const line of lines) {
            if (line.trim()) {
              if (options.onStdout) {
                options.onStdout(line);
              }
            }
          }
        });
      }

      if (subprocess.stderr) {
        subprocess.stderr.on("data", (data: Buffer) => {
          const lines = data.toString().split(/\r?\n/);
          for (const line of lines) {
            if (line.trim()) {
              if (options.onStderr) {
                options.onStderr(line);
              }
            }
          }
        });
      }
    }

    const { stdout, stderr, exitCode } = await subprocess;

    return {
      success: true,
      stdout,
      stderr,
      exitCode,
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error),
      exitCode: error.exitCode,
    };
  }
}
