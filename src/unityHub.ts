import fs from "fs-extra";
import os from "os";
import {
  EditorArchitecture,
  ModuleId,
  UnityHubProject,
  UnityHubProjectsList,
  UnityInstallations,
} from "./types/unity.js";
import { CommandOptions, CommandResult, executeCommand } from "./utils/commandExecutor.js";
import { getUnityChangeset } from "unity-changeset";
import { UnityHubInstallerEvent } from "./events/hubEventEmitter.ts";
import { PlatformConfig, UnityConfig } from "./configs/unityConfig.ts";

/**
 * Class for interacting with Unity Hub via command line interface
 * Provides methods to manage Unity installations, projects, and Hub configuration
 */
class UnityHub {
  /**
   * Path to Unity Hub executable
   * @internal
   */
  private static hubPath: string = this.getUnityHubPath();

  /**
   * Platform-specific configuration for Unity Hub
   * @internal
   */
  private static unityConfig: PlatformConfig = UnityConfig.getPlatformConfig();

  /**
   * Gets the Unity Hub executable path based on environment variable or default locations
   * @returns {string} Path to Unity Hub executable
   * @public
   */
  public static getUnityHubPath(): string {
    return this.unityConfig.hub.hubDir;
  }

  /**
   * Gets the path to the Unity Hub projects JSON file
   * @returns {string} Path to projects file
   * @internal
   */
  private static getProjectsPath(): string {
    return this.unityConfig.hub.projects;
  }

  /**
   * Gets the path to the Unity Hub project directory configuration file
   * @returns {string} Path to project directory configuration file
   * @internal
   */
  private static getProjectDirPath(): string {
    return this.unityConfig.hub.projectDir;
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
   * @returns {Promise<CommandResult>} Object containing command execution results
   * @throws Will return error information in the result object rather than throwing
   * @public
   */
  public static async execUnityHubCommand(args: string[], options: CommandOptions = {}): Promise<CommandResult> {
    const isAvailable = await UnityHub.isUnityHubAvailable();
    if (!isAvailable) {
      console.error("Unity Hub is not available.");
      return {
        success: false,
        stdout: "",
        stderr: "Unity Hub is not available.",
        exitCode: -1,
      };
    }

    try {
      const hubArgs = [this.unityConfig.platform !== "linux" ? "--" : "", "--headless", ...args].filter(Boolean);
      console.debug(`Executing Unity Hub command: ${this.hubPath} ${hubArgs.join(" ")}`);

      return await executeCommand(this.hubPath, hubArgs, options);
    } catch (error) {
      console.error("Error executing Unity Hub command:", error);
      return {
        success: false,
        stdout: "",
        stderr: String(error),
        exitCode: -1,
      };
    }
  }

  /**
   * Gets the Unity Hub installation path
   * @returns {Promise<string>} Path to Unity Hub installation
   * @throws Will return empty string on error
   * @public
   */
  public static async getInstallPath(): Promise<string> {
    const { stdout, stderr } = await this.execUnityHubCommand(["install-path", "-g"], {
      reject: false,
    });
    if (stderr) {
      throw new Error(`Error getting install path: ${stderr}`);
    }

    return stdout;
  }

  /**
   * Sets the Unity Hub installation path
   * @param {string} path - Path to set as the Unity Hub installation directory
   * @returns {Promise<void>} Resolves when the installation path is set successfully
   * @throws Will throw an error if command execution fails
   * @public
   */
  public static async setInstallPath(path: string): Promise<void> {
    const { stdout, stderr } = await this.execUnityHubCommand(["install-path", "-s", path], {
      reject: false,
    });
    if (stderr) {
      throw new Error(`Error setting install path: ${stderr}`);
    }
    console.debug(`Install path set to: ${stdout}`);
  }

  /**
   * Gets all installed Unity versions with their installation paths, if using filter you can get all available releases instead of only installed ones
   * @param {string} [filter="i"] - Filter for installations (e.g. "i" for installed ( both available releases and Editors installed on your machine ), "a" for all and "r" for available releases)
   * @returns {Promise<UnityInstallations>} Object mapping Unity versions to their installation paths
   * @throws Will throw an error if command execution fails or no installations are found
   * @public
   */
  public static async getUnityInstallations(filter: string = "i"): Promise<UnityInstallations> {
    if (!["i", "a", "r"].includes(filter)) {
      throw new Error(`Invalid filter "${filter}". Use "i" for installed, "a" for all, or "r" for available releases.`);
    }

    const { stdout, stderr } = await this.execUnityHubCommand(["editors", `-${filter}`], {
      reject: false,
    });

    const isSuccess = stdout.includes(", installed at");
    if (stderr) throw new Error(`Get installations command warning/error: ${stderr}`);
    if (!isSuccess) throw new Error(`Consider install a Unity version using Unity Hub.`);

    const lines = stdout.split(/\r\n|\n/);
    const installations: UnityInstallations = {};

    lines.forEach((line: string) => {
      const [version, unityPath] = line.split(", installed at").map((entry: string) => entry.trim());

      installations[version] = unityPath;
    });

    if (Object.keys(installations).length <= 0) throw new Error("No unity installations found.");

    return installations;
  }

  /**
   * Adds modules to an existing Unity installation
   * @param {string} editorVersion - Unity version to add modules to (e.g. "2022.3.60f1")
   * @param {ModuleId[]} modules - Array of module IDs to add
   * @param {boolean} [childModules=false] - Whether to include child modules
   * @returns {UnityHubInstallerEvent} Event emitter for installation progress
   * @throws Will throw an error if module addition fails
   * @public
   */
  public static async addModule(
    editorVersion: string,
    modules: ModuleId[],
    childModules: boolean = true
  ): Promise<UnityHubInstallerEvent> {
    try {
      console.debug(`Adding module ${modules} to Unity ${editorVersion}`);

      const args = ["install-modules", "-v", editorVersion];

      if (modules.length > 0) {
        args.push(...["--module", modules.join(" ")]);

        if (childModules) {
          args.push("--child-modules");
        }
      } else {
        throw new Error("No module IDs provided.");
      }

      const installerEmitter = new UnityHubInstallerEvent();
      this.execUnityHubCommand(args, {
        reject: false,
        //onStderr: (data: string) => installerEmitter.Progress(data),
        onStdout: (data: string) => installerEmitter.Progress(data),
      }).catch((error) => {
        console.error(`Error adding module ${modules} to Unity ${editorVersion}:`, error);
      });
      return installerEmitter;
    } catch (error) {
      console.error(`Error adding module ${modules} to Unity ${editorVersion}:`, error);
      throw error;
    }
  }

  /**
   * Installs a Unity Editor version
   * @param {string} version - Unity version to install (e.g. "2022.3.60f1")
   * @param {string} [changeset] - Optional specific changeset to install
   * @param {ModuleId[]} [modules=[]] - Optional array of modules to install with the editor
   * @param {EditorArchitecture} [architecture=EditorArchitecture.x86_64] - Optional architecture (x86_64 or arm64)
   * @returns {UnityHubInstallerEvent} Event emitter for installation progress
   * @throws Will throw an error if installation fails to start
   * @public
   */
  public static async addEditor(
    version: string,
    modules: ModuleId[] = [],
    architecture?: EditorArchitecture
  ): Promise<UnityHubInstallerEvent> {
    try {
      const data = await getUnityChangeset(version);
      const args = ["install", "-v", version];

      args.push("--changeset", data.changeset);

      if (modules.length > 0) {
        args.push("--module");
        args.push(modules.join(" "));
      }

      if (!architecture) {
        const arch = os.arch() || process.arch;
        const defaultArchitecture =
          arch === "arm64" || arch === "arm" ? EditorArchitecture.arm64 : EditorArchitecture.x86_64;
        architecture = defaultArchitecture;
      }

      args.push("--architecture", architecture);

      const installerEmitter = new UnityHubInstallerEvent();
      this.execUnityHubCommand(args, {
        reject: false,
        //onStderr: (data: string) => installerEmitter.Error(data),
        onStdout: (data: string) => installerEmitter.Progress(data),
      }).catch((error) => {
        console.error(`Error installing Unity ${version}:`, error);
      });

      return installerEmitter;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * Gets list of projects from Unity Hub
   * @returns {Promise<Array<{name: string, path: string, version: string}>>} Array of projects
   * @throws Will not throw errors, returns empty array on failure
   * @public
   */
  public static async getProjects(): Promise<{ name: string; path: string; version: string }[]> {
    try {
      const projectsPath = this.getProjectsPath();

      if (!projectsPath || !fs.existsSync(projectsPath)) {
        console.debug(`Projects file not found at: ${projectsPath}`);
        return [];
      }

      const projectsData: UnityHubProjectsList = await fs.readJson(projectsPath);
      const projects = Object.values(projectsData.data);

      return projects.map((project: UnityHubProject) => ({
        name: project.title,
        path: project.path,
        version: project.version,
      }));
    } catch (error) {
      console.error("Error getting recent projects:", error);
      return [];
    }
  }

  /**
   * Gets the default project directory configured in Unity Hub
   * @returns {Promise<string|null>} Path to default project directory or null if not found
   * @throws Will not throw errors, returns null on failure
   * @public
   */
  public static async getDefaultProjectsDirectory(): Promise<string | null> {
    try {
      const projectDirPath = this.getProjectDirPath();

      if (!projectDirPath || !fs.existsSync(projectDirPath)) {
        console.debug(`Project directory file not found at: ${projectDirPath}`);
        return null;
      }

      const projectDirData = await fs.readJson(projectDirPath);
      return projectDirData.directoryPath ?? null;
    } catch (error) {
      console.error("Error getting default project directory:", error);
      return null;
    }
  }
}

export default UnityHub;
