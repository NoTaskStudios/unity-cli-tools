import fs from "fs-extra";
import os from "os";
import path from "path";
import {
  EditorArchitecture,
  ModuleId,
  UnityHubProject,
  UnityHubProjectsList,
  UnityInstallations,
  UnityEditorLanguages,
  UnityModules,
} from "./types/unity.js";
import { CommandOptions, CommandResult, executeCommand } from "./utils/commandExecutor.js";

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
   * Available Unity module identifiers
   * @public
   */
  public static readonly Modules = UnityModules;

  /**
   * Available Unity language packs
   * @public
   */
  public static readonly Languages = UnityEditorLanguages;

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
      if (!this.hubPath || !fs.existsSync(this.hubPath)) {
        return false;
      } else {
        return true;
      }
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
      const hubArgs = [this.platform !== "linux" ? "--" : "", "--headless", ...args].filter(Boolean);
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
   * @returns {Promise<void>} Resolves when modules are added successfully
   * @throws Will throw an error if module addition fails
   * @public
   */
  public static async addModule(
    editorVersion: string,
    modules: ModuleId[],
    childModules: boolean = false
  ): Promise<void> {
    try {
      console.debug(`Adding module ${modules} to Unity ${editorVersion}`);

      const args = ["install-modules", "-v", editorVersion];

      if (modules.length > 0) {
        args.push("--module");
        args.push(modules.join(" "));
      } else {
        throw new Error("No module IDs provided.");
      }

      if (childModules) {
        args.push("--child-modules");
      }

      const { stdout, stderr } = await this.execUnityHubCommand(args, {
        reject: false,
      });

      console.debug(`Add module command output: ${stdout}`);

      if (stderr) {
        console.warn(`Add module command warning/error: ${stderr}`);
      }
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
   * @returns {Promise<void>} Resolves when editor installation begins successfully
   * @throws Will throw an error if installation fails to start
   * @public
   */
  public static async addEditor(
    version: string,
    changeset?: string,
    modules: ModuleId[] = [],
    architecture: EditorArchitecture = EditorArchitecture.x86_64
  ): Promise<void> {
    try {
      console.debug(`Installing Unity ${version} ${(changeset ?? "") ? `(changeset: ${changeset})` : ""}`);
      const args = ["install", "-v", version];

      if (changeset) {
        args.push("--changeset", changeset);
      }

      if (modules.length > 0) {
        args.push("--module");
        args.push(modules.join(" "));
      }

      if (this.platform === "darwin") {
        args.push("--architecture", architecture);
      }

      const { stdout, stderr } = await this.execUnityHubCommand(args, {
        reject: false,
      });

      if (stderr) {
        throw new Error(`Error installing Unity ${version}: ${stderr}`);
      }

      console.log(`Unity ${version}. ${stdout}`);
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
