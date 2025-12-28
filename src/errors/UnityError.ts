/**
 * Base class for all Unity-related errors
 */
export abstract class UnityError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when Unity Hub is not found or not available
 */
export class UnityHubNotFoundError extends UnityError {
  constructor(message: string = "Unity Hub is not available", context?: Record<string, unknown>) {
    super(message, "UNITY_HUB_NOT_FOUND", context);
  }
}

/**
 * Error thrown when Unity Editor is not found or not available
 */
export class UnityEditorNotFoundError extends UnityError {
  constructor(version: string, path?: string) {
    super(
      `Unity Editor version ${version} not found${path ? ` at path: ${path}` : ""}`,
      "UNITY_EDITOR_NOT_FOUND",
      { version, path }
    );
  }
}

/**
 * Error thrown when a Unity command execution fails
 */
export class UnityCommandError extends UnityError {
  public readonly stdout: string;
  public readonly stderr: string;
  public readonly exitCode?: number;

  constructor(
    message: string,
    stdout: string = "",
    stderr: string = "",
    exitCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message, "UNITY_COMMAND_ERROR", context);
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

/**
 * Error thrown when Unity installation operations fail
 */
export class UnityInstallationError extends UnityError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "UNITY_INSTALLATION_ERROR", context);
  }
}

/**
 * Error thrown when Unity project operations fail
 */
export class UnityProjectError extends UnityError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "UNITY_PROJECT_ERROR", context);
  }
}

/**
 * Error thrown when Unity license operations fail
 */
export class UnityLicenseError extends UnityError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "UNITY_LICENSE_ERROR", context);
  }
}

/**
 * Error thrown when Unity package operations fail
 */
export class UnityPackageError extends UnityError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "UNITY_PACKAGE_ERROR", context);
  }
}

/**
 * Error thrown when Unity test operations fail
 */
export class UnityTestError extends UnityError {
  public readonly testOutput: string;

  constructor(message: string, testOutput: string = "", context?: Record<string, unknown>) {
    super(message, "UNITY_TEST_ERROR", context);
    this.testOutput = testOutput;
  }
}

/**
 * Error thrown for invalid arguments or parameters
 */
export class InvalidArgumentError extends UnityError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "INVALID_ARGUMENT", context);
  }
}
