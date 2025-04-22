import { Options, execa } from "execa";

export interface CommandOptions extends Options {
  reject?: boolean;
  timeout?: number;
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
    const subprocess = execa(executable, args, {
      reject: options.reject ?? false,
      timeout: options.timeout,
      env: options.env,
      cwd: options.cwd,
      encoding: "utf8",
    });

    /*
    // Pipe the output to the parent process
    // This is commented out to avoid cluttering the output
    // Uncomment if you want to see the output in real-time
    if (subprocess.stdout) {
      subprocess.stdout.pipe(process.stdout);
    }

    if (subprocess.stderr) {
      subprocess.stderr.pipe(process.stderr);
    }
    */

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
