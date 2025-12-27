import fs from "fs-extra";
import os from "os";
import path from "path";
import {
  EditorArchitecture,
  ModuleId,
  UnityHubProject,
  UnityHubProjectsList,
  UnityInstallations,
} from "./types/unity.js";
import { CommandOptions, CommandOutput, executeCommand } from "./utils/commandExecutor.js";
import { getUnityChangeset } from "unity-changeset";
import { UnityHubInstallerEvent } from "./events/hubEventEmitter.js";
import {
  Result,
  ok,
  err,
  UnityHubNotFoundError,
  UnityCommandError,
  UnityInstallationError,
  UnityProjectError,
  InvalidArgumentError,
} from "./errors/index.js";

/**
 * Class for interacting with Unity Hub via command line interface
 * Provides methods to manage Unity installations, projects, and Hub configuration
 */
class UnityHub {
  /**
   * Platform-specific paths for Unity Hub components
   * @private
   */
  private static CONFIG_PATHS = {
    win32: {
      hub: "C:\\Program Files\\Unity Hub\\Unity Hub.exe",
      projects: path.join(os.homedir(), "AppData", "Roaming", "UnityHub", "projects-v1.json"),
      projectDir: path.join(os.homedir(), "AppData", "Roaming", "UnityHub", "projectDir.json"),
    },
    darwin: {
      hub: "/Applications/Unity Hub.app/Contents/MacOS/Unity Hub",
      projects: path.join(os.homedir(), "Library", "Application Support", "UnityHub", "projects-v1.json"),
      projectDir: path.join(os.homedir(), "Library", "Application Support", "UnityHub", "projectDir.json"),
    },
    linux: {
      hub: "/opt/UnityHub/UnityHub",
      projects: path.join(os.homedir(), ".config", "UnityHub", "projects-v1.json"),
      projectDir: path.join(os.homedir(), ".config", "UnityHub", "projectDir.json"),
    },
  };

  /**
   * Current platform (win32, darwin, linux)
   * @internal
   */
  private static platform: string = os.platform() as keyof typeof UnityHub.CONFIG_PATHS;

  /**
   * Path to Unity Hub executable
   * @internal
   */
  private static hubPath: string = this.getUnityHubPath();

  /**
   * Gets the Unity Hub executable path based on environment variable or default locations
   * @returns {string} Path to Unity Hub executable
   * @public
   */
  public static getUnityHubPath(): string {
    const envPath = process.env.UNITY_HUB_PATH ?? "";
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    return UnityHub.CONFIG_PATHS[this.platform as keyof typeof UnityHub.CONFIG_PATHS].hub || "";
  }

  /**
   * Gets the path to the Unity Hub projects JSON file
   * @returns {string} Path to projects file
   * @internal
   */
  private static getProjectsPath(): string {
    return UnityHub.CONFIG_PATHS[this.platform as keyof typeof UnityHub.CONFIG_PATHS].projects || "";
  }

  /**
   * Gets the path to the Unity Hub project directory configuration file
   * @returns {string} Path to project directory configuration file
   * @internal
   */
  private static getProjectDirPath(): string {
    return UnityHub.CONFIG_PATHS[this.platform as keyof typeof UnityHub.CONFIG_PATHS].projectDir || "";
  }

  /**
   * Checks if Unity Hub is available and accessible
   * @returns {Promise<boolean>} True if Unity Hub is available, false otherwise
   * @throws Will not throw errors, returns false on any failure
   * @public
   */
  public static async isUnityHubAvailable(): Promise<boolean> {
    try {
      return !!this.hubPath && fs.existsSync(this.hubPath);
    } catch (error) {
      console.error("Error checking Unity Hub availability:", error);
      return false;
    }
  }

  /**
   * Executes a command in Unity Hub
   * @param {string[]} args - Array of command arguments to pass to Unity Hub
   * @param {CommandOptions} options - Options for command execution
   * @param {boolean} [options.reject=false] - Whether to reject the promise on error
   * @param {number} [options.timeout] - Timeout in milliseconds
   * @param {Record<string, string>} [options.env] - Environment variables
   * @param {string} [options.cwd] - Working directory
   * @returns {Promise<Result<CommandOutput>>} Result containing command execution output or error
   * @public
   */
  public static async execUnityHubCommand(
    args: string[],
    options: CommandOptions = {}
  ): Promise<Result<CommandOutput, UnityHubNotFoundError | UnityCommandError>> {
    const isAvailable = await UnityHub.isUnityHubAvailable();
    if (!isAvailable) {
      console.error("Unity Hub is not available.");
      return err(new UnityHubNotFoundError("Unity Hub is not available", { hubPath: this.hubPath }));
    }

    const hubArgs = [this.platform !== "linux" ? "--" : "", "--headless", ...args].filter(Boolean);
    console.debug(`Executing Unity Hub command: ${this.hubPath} ${hubArgs.join(" ")}`);

    return await executeCommand(this.hubPath, hubArgs, options);
  }

  /**
   * Gets the Unity Hub installation path
   * @returns {Promise<Result<string>>} Result containing the installation path or error
   * @public
   */
  public static async getInstallPath(): Promise<Result<string, UnityHubNotFoundError | UnityCommandError>> {
    const result = await this.execUnityHubCommand(["install-path", "-g"], {
      reject: false,
    });

    if (!result.success) {
      return result;
    }

    if (result.value.stderr) {
      return err(
        new UnityCommandError(
          `Error getting install path: ${result.value.stderr}`,
          result.value.stdout,
          result.value.stderr,
          result.value.exitCode
        )
      );
    }

    return ok(result.value.stdout.trim());
  }

  /**
   * Sets the Unity Hub installation path
   * @param {string} path - Path to set as the Unity Hub installation directory
   * @returns {Promise<Result<void>>} Result indicating success or error
   * @public
   */
  public static async setInstallPath(
    path: string
  ): Promise<Result<void, UnityHubNotFoundError | UnityCommandError>> {
    const result = await this.execUnityHubCommand(["install-path", "-s", path], {
      reject: false,
    });

    if (!result.success) {
      return result;
    }

    if (result.value.stderr) {
      return err(
        new UnityCommandError(
          `Error setting install path: ${result.value.stderr}`,
          result.value.stdout,
          result.value.stderr,
          result.value.exitCode
        )
      );
    }

    console.debug(`Install path set to: ${result.value.stdout}`);
    return ok(undefined);
  }

  /**
   * Gets all installed Unity versions with their installation paths, if using filter you can get all available releases instead of only installed ones
   * @param {string} [filter="i"] - Filter for installations (e.g. "i" for installed ( both available releases and Editors installed on your machine ), "a" for all and "r" for available releases)
   * @returns {Promise<Result<UnityInstallations>>} Result containing object mapping Unity versions to their installation paths or error
   * @public
   */
  public static async getUnityInstallations(
    filter: string = "i"
  ): Promise<Result<UnityInstallations, InvalidArgumentError | UnityHubNotFoundError | UnityCommandError | UnityInstallationError>> {
    if (!["i", "a", "r"].includes(filter)) {
      return err(
        new InvalidArgumentError(
          `Invalid filter "${filter}". Use "i" for installed, "a" for all, or "r" for available releases.`,
          { filter, validFilters: ["i", "a", "r"] }
        )
      );
    }

    const result = await this.execUnityHubCommand(["editors", `-${filter}`], {
      reject: false,
    });

    if (!result.success) {
      return result;
    }

    const { stdout, stderr } = result.value;
    const isSuccess = stdout.includes(", installed at");

    if (stderr) {
      return err(
        new UnityCommandError(`Get installations command warning/error: ${stderr}`, stdout, stderr, result.value.exitCode)
      );
    }

    if (!isSuccess) {
      return err(
        new UnityInstallationError("No Unity installations found. Consider installing a Unity version using Unity Hub.", {
          filter,
        })
      );
    }

    const lines = stdout.split(/\r\n|\n/);
    const installations: UnityInstallations = {};

    lines.forEach((line: string) => {
      const [version, unityPath] = line.split(", installed at").map((entry: string) => entry.trim());
      if (version && unityPath) {
        installations[version] = unityPath;
      }
    });

    if (Object.keys(installations).length <= 0) {
      return err(new UnityInstallationError("No Unity installations found.", { filter }));
    }

    return ok(installations);
  }

  /**
   * Adds modules to an existing Unity installation
   * @param {string} editorVersion - Unity version to add modules to (e.g. "2022.3.60f1")
   * @param {ModuleId[]} modules - Array of module IDs to add
   * @param {boolean} [childModules=false] - Whether to include child modules
   * @returns {Result<UnityHubInstallerEvent>} Result containing event emitter for installation progress or error
   * @public
   */
  public static async addModule(
    editorVersion: string,
    modules: ModuleId[],
    childModules: boolean = true
  ): Promise<Result<UnityHubInstallerEvent, InvalidArgumentError>> {
    if (modules.length === 0) {
      return err(new InvalidArgumentError("No module IDs provided.", { editorVersion, modules }));
    }

    console.debug(`Adding module ${modules} to Unity ${editorVersion}`);

    const args = ["install-modules", "-v", editorVersion, "--module", modules.join(" ")];

    if (childModules) {
      args.push("--child-modules");
    }

    const installerEmitter = new UnityHubInstallerEvent();

    this.execUnityHubCommand(args, {
      reject: false,
      onStdout: (data: string) => installerEmitter.Progress(data),
    })
      .then((result) => {
        if (!result.success) {
          console.error(`Error adding module ${modules} to Unity ${editorVersion}:`, result.error);
        }
      })
      .catch((error) => {
        console.error(`Error adding module ${modules} to Unity ${editorVersion}:`, error);
      });

    return ok(installerEmitter);
  }

  /**
   * Installs a Unity Editor version
   * @param {string} version - Unity version to install (e.g. "2022.3.60f1")
   * @param {ModuleId[]} [modules=[]] - Optional array of modules to install with the editor
   * @param {EditorArchitecture} [architecture] - Optional architecture (x86_64 or arm64), defaults to system architecture
   * @returns {Promise<Result<UnityHubInstallerEvent>>} Result containing event emitter for installation progress or error
   * @public
   */
  public static async addEditor(
    version: string,
    modules: ModuleId[] = [],
    architecture?: EditorArchitecture
  ): Promise<Result<UnityHubInstallerEvent, UnityInstallationError>> {
    try {
      const data = await getUnityChangeset(version);
      const args = ["install", "-v", version, "--changeset", data.changeset];

      if (modules.length > 0) {
        args.push("--module", modules.join(" "));
      }

      if (!architecture) {
        const arch = os.arch() || process.arch;
        architecture = arch === "arm64" || arch === "arm" ? EditorArchitecture.arm64 : EditorArchitecture.x86_64;
      }

      args.push("--architecture", architecture);

      const installerEmitter = new UnityHubInstallerEvent();

      this.execUnityHubCommand(args, {
        reject: false,
        onStdout: (data: string) => installerEmitter.Progress(data),
      })
        .then((result) => {
          if (!result.success) {
            console.error(`Error installing Unity ${version}:`, result.error);
          }
        })
        .catch((error) => {
          console.error(`Error installing Unity ${version}:`, error);
        });

      return ok(installerEmitter);
    } catch (error) {
      console.error(error);
      return err(
        new UnityInstallationError(`Failed to install Unity ${version}: ${String(error)}`, { version, modules, architecture })
      );
    }
  }

  /**
   * Gets list of projects from Unity Hub
   * @returns {Promise<Result<Array<{name: string, path: string, version: string}>>>} Result containing array of projects or error
   * @public
   */
  public static async getProjects(): Promise<
    Result<{ name: string; path: string; version: string }[], UnityProjectError>
  > {
    try {
      const projectsPath = this.getProjectsPath();

      if (!projectsPath || !fs.existsSync(projectsPath)) {
        console.debug(`Projects file not found at: ${projectsPath}`);
        return err(
          new UnityProjectError(`Projects file not found at: ${projectsPath}`, { projectsPath })
        );
      }

      const projectsData: UnityHubProjectsList = await fs.readJson(projectsPath);
      const projects = Object.values(projectsData.data);

      const mappedProjects = projects.map((project: UnityHubProject) => ({
        name: project.title,
        path: project.path,
        version: project.version,
      }));

      return ok(mappedProjects);
    } catch (error) {
      console.error("Error getting recent projects:", error);
      return err(new UnityProjectError(`Failed to get projects: ${String(error)}`));
    }
  }

  /**
   * Gets the default project directory configured in Unity Hub
   * @returns {Promise<Result<string | null>>} Result containing path to default project directory or null if not configured
   * @public
   */
  public static async getDefaultProjectsDirectory(): Promise<Result<string | null, UnityProjectError>> {
    try {
      const projectDirPath = this.getProjectDirPath();

      if (!projectDirPath || !fs.existsSync(projectDirPath)) {
        console.debug(`Project directory file not found at: ${projectDirPath}`);
        return ok(null);
      }

      const projectDirData = await fs.readJson(projectDirPath);
      return ok(projectDirData.directoryPath ?? null);
    } catch (error) {
      console.error("Error getting default project directory:", error);
      return err(new UnityProjectError(`Failed to get default project directory: ${String(error)}`));
    }
  }
}

export default UnityHub;
