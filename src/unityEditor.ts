import os from "os";
import fs from "fs-extra";
import path from "path";
import { ProjectInfo, TestMode, UnityBuildTarget, UnityEditorInfo } from "./types/unity.js";
import { CommandOptions, CommandResult, executeCommand } from "./utils/commandExecutor.js";
import { redactSensitiveArgs } from "./utils/security.js";

/**
 * UnityEditor class provides a comprehensive interface for interacting with the Unity game engine editor
 * programmatically. It enables automating various Unity tasks such as running tests, managing licenses,
 * manipulating packages, and creating/opening projects across different operating systems.
 *
 * @class UnityEditor
 */
class UnityEditor {
  /**
   * Configuration paths for Unity Editor executables across different operating systems.
   * The structure provides base installation directories and relative paths to the
   * executable for each supported platform (Windows, macOS, Linux).
   *
   * @private
   * @static
   * @type {Object<string, {base: string, executable: string}>}
   *
   * @internal
   */
  private static UNITY_PATHS = {
    win32: {
      base: "C:/Program Files/Unity/Hub/Editor",
      executable: "Editor/Unity.exe",
      templates: "Editor/Data/Resources/PackageManager/ProjectTemplates",
    },
    darwin: {
      base: "/Applications/Unity/Hub/Editor",
      executable: "Unity.app/Contents/MacOS/Unity",
      templates: "Editor/Data/Resources/PackageManager/ProjectTemplates",
    },
    linux: {
      base: "/opt/unity/editor",
      executable: "Editor/Unity",
      templates: "",
    },
  };

  /**
   * Resolves the platform-specific path to the Unity executable for a given version.
   * This function detects the current operating system and combines the appropriate
   * base path with the version-specific subdirectory and executable location.
   *
   * @public
   * @static
   * @param {string} version - Unity editor version in the format "YYYY.N.XfN" (e.g., "2023.3.0f1")
   * @returns {string} Absolute path to the Unity executable for the specified version
   * @throws {Error} If the current platform is not supported (not win32, darwin, or linux)
   * @example
   * // Returns "C:/Program Files/Unity/Hub/Editor/2022.3.15f1/Editor/Unity.exe" on Windows
   * const unityPath = UnityEditor.getUnityExecutablePath("2022.3.15f1");
   */
  public static getUnityExecutablePath(version: string): string {
    const platform = os.platform() as keyof typeof UnityEditor.UNITY_PATHS;
    const unityConfig = UnityEditor.UNITY_PATHS[platform];

    const unityPath = path.join(unityConfig.base, version, unityConfig.executable);
    return unityPath;
  }

  /**
   * Resolves the platform-specific path to the Unity templates directory for a given version.
   * This function detects the current operating system and combines the appropriate
   * base path with the version-specific subdirectory and templates location.
   *
   * @public
   * @static
   * @param {string} version - Unity editor version in the format "YYYY.N.XfN" (e.g., "2023.3.0f1")
   * @returns {string} Absolute path to the Unity templates directory for the specified version
   * @throws {Error} If the current platform is not supported (not win32, darwin, or linux)
   */
  public static getUnityTemplatesPath(version: string): string {
    const platform = os.platform() as keyof typeof UnityEditor.UNITY_PATHS;
    const unityConfig = UnityEditor.UNITY_PATHS[platform];

    const unityPath = path.join(unityConfig.base, version, unityConfig.templates);
    return unityPath;
  }

  /**
   * Checks if a specific Unity editor version is installed on the system.
   * This is accomplished by verifying the existence of the Unity executable
   * at the expected path for the given version.
   *
   * @public
   * @static
   * @param {string} version - Unity editor version to check (e.g., "2023.3.0f1")
   * @returns {Promise<boolean>} Promise resolving to true if the version is installed, false otherwise
   * @example
   * // Check if Unity 2022.3.15f1 is installed
   * const isInstalled = await UnityEditor.isUnityVersionInstalled("2022.3.15f1");
   * if (isInstalled) {
   *   console.log("Unity version is installed");
   * } else {
   *   console.log("Unity version is not installed");
   * }
   */
  public static async isUnityVersionInstalled(version: string): Promise<boolean> {
    try {
      const unityPath = this.getUnityExecutablePath(version);
      return fs.existsSync(unityPath);
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * Executes an arbitrary Unity Editor command with the provided arguments.
   * This low-level function serves as the foundation for all other Unity operations,
   * providing direct access to the Unity command-line interface.
   *
   * @public
   * @static
   * @param {UnityEditorInfo} editorInfo - Information about the Unity editor to use, including version and optional custom path
   * @param {string[]} args - Array of command-line arguments to pass to the Unity Editor
   * @param {CommandOptions} [options={}] - Execution options for command handling
   * @param {boolean} [options.reject=false] - Whether to reject the promise on error or return error information
   * @param {number} [options.timeout] - Optional timeout in milliseconds after which the command execution is aborted
   * @param {Object} [options.env] - Optional environment variables to pass to the command
   * @returns {Promise<CommandResult>} Promise resolving to an object containing execution results:
   *                                   - success: boolean indicating command success
   *                                   - stdout: captured standard output
   *                                   - stderr: captured standard error
   *                                   - exitCode: process exit code
   * @throws {Error} Will throw if command execution fails and reject option is true
   */
  public static async execUnityEditorCommand(
    editorInfo: UnityEditorInfo,
    args: string[],
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    try {
      const unityPath = this.getUnityExecutablePath(editorInfo.version);

      if (!fs.existsSync(unityPath)) {
        return {
          success: false,
          stdout: "",
          stderr: `Unity executable not found at path: ${unityPath}`,
          exitCode: -1,
        };
      }

      const editorArgs = [...args];
      const redactedArgs = redactSensitiveArgs(editorArgs);

      console.debug(`Executing Unity Editor command: ${unityPath} ${redactedArgs.join(" ")}`);

      return await executeCommand(unityPath, editorArgs, options);
    } catch (error) {
      console.error("Error executing Unity Editor command:", error);

      return {
        success: false,
        stdout: "",
        stderr: String(error),
        exitCode: -1,
      };
    }
  }

  /**
   * Executes a static method in a Unity C# script through the command line.
   * This powerful function allows invoking any static method in the Unity project,
   * enabling complex automation tasks defined in custom editor scripts.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the Unity project including path and editor version
   * @param {string} method - Fully qualified method name to execute (e.g., "MyNamespace.MyEditorClass.MyStaticMethod")
   * @param {string[]} [args=[]] - Optional arguments to pass to the method
   * @param {CommandOptions} [options={}] - Command execution options
   * @returns {Promise<string|null>} - Promise resolving to the method's output or null if execution failed
   * @example
   * // Execute a build method defined in a custom editor script
   * const output = await UnityEditor.executeMethod(
   *   { path: "/path/to/project", editorVersion: "2022.3.15f1" },
   *   "MyCompany.BuildTools.PerformBuild"
   * );
   */
  public static async executeMethod(
    projectInfo: ProjectInfo,
    method: string,
    args: string[] = [],
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    try {
      console.debug(`Executing method ${method} in Unity Editor`);

      const unityPath = this.getUnityExecutablePath(projectInfo.editorVersion);
      const editorArgs = ["-projectPath", projectInfo.projectPath, "-executeMethod", method, ...args];

      const { stdout, stderr } = await this.execUnityEditorCommand(
        { version: projectInfo.editorVersion, path: unityPath },
        editorArgs,
        options
      );

      if (stderr) {
        console.error(`Error executing method: ${stderr}`);
        return {
          success: false,
          stdout: "",
          stderr: stderr,
          exitCode: -1,
        };
      }

      return {
        success: true,
        stdout: stdout,
        stderr: "",
        exitCode: 0,
      };
    } catch (error) {
      console.error("Error executing method:", error);
      return {
        success: false,
        stdout: "",
        stderr: String(error),
        exitCode: -1,
      };
    }
  }

  /**
   * Runs Unity test suites via command line in either EditMode or PlayMode.
   * This function enables automated testing of Unity projects as part of CI/CD pipelines,
   * allowing for filtering tests by category and targeting specific test platforms.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the project to test
   * @param {TestMode | UnityBuildTarget} [testPlatform=TestMode.EditMode] - Test platform to run tests in:
   *                                      - TestMode.EditMode: Run tests in editor without entering play mode
   *                                      - TestMode.PlayMode: Run tests with the editor in play mode
   *                                      - Or specify a build target (e.g., UnityBuildTarget.StandaloneWindows64)
   * @param {string} [testCategory] - Optional category filter to run only tests with the specified category attribute
   * @returns {Promise<{ success: boolean; output: string }>} - Promise resolving to test results:
   *                                                          - success: Whether all tests passed
   *                                                          - output: Test execution output
   * @example
   * // Run all PlayMode tests in the "Performance" category
   * const results = await UnityEditor.runTests(
   *   { path: "/path/to/project", editorVersion: "2022.3.15f1" },
   *   TestMode.PlayMode,
   *   "Performance"
   * );
   *
   * if (results.success) {
   *   console.log("All tests passed!");
   * } else {
   *   console.error("Tests failed. Output:", results.output);
   * }
   */
  public static async runTests(
    projectInfo: ProjectInfo,
    testPlatform: TestMode | UnityBuildTarget = TestMode.EditMode,
    testCategory?: string
  ): Promise<{ success: boolean; output: string }> {
    try {
      console.debug(`Running ${testPlatform} tests for project ${testCategory ? ` in category ${testCategory}` : ""}`);

      const args = [
        "-batchmode",
        "-quit",
        "-projectPath",
        projectInfo.projectPath,
        "-runTests",
        "-testPlatform",
        testPlatform,
      ];

      if (testCategory) {
        args.push("-testCategory", testCategory);
      }

      const editorInfo = { version: projectInfo.editorVersion };
      const { stdout, stderr } = await this.execUnityEditorCommand(editorInfo, args, {
        reject: false,
      });

      const testsFailed =
        stdout.includes("Some tests failed") ||
        stdout.includes("Test run failed") ||
        stderr.includes("Test run failed");

      return {
        success: !testsFailed,
        output: stdout,
      };
    } catch (error) {
      console.error("Error running tests:", error);
      return {
        success: false,
        output: String(error),
      };
    }
  }

  /**
   * Activates a Unity license using serial number authentication.
   * This function handles the license activation process required for running
   * Unity in batch mode on build servers or other automation environments.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the project (used to determine Unity version)
   * @param {string} serial - Unity license serial number (Pro/Plus/Enterprise license)
   * @param {string} username - Unity account username associated with the license
   * @param {string} password - Unity account password
   * @returns {Promise<boolean>} - Promise resolving to true if license activation was successful, false otherwise
   * @example
   * // Activate a Unity Pro license
   * const success = await UnityEditor.activateLicense(
   *   { editorVersion: "2022.3.15f1", path: "/path/to/project" },
   *   "XXXX-XXXX-XXXX-XXXX-XXXX",
   *   "username@example.com",
   *   "password123"
   * );
   *
   * if (success) {
   *   console.log("License activated successfully");
   * } else {
   *   console.error("License activation failed");
   * }
   *
   * @security Note: It's recommended to pass credentials securely via environment variables
   *           rather than hardcoding them in your scripts
   */
  public static async activateLicense(
    projectInfo: ProjectInfo,
    serial: string,
    username: string,
    password: string
  ): Promise<boolean> {
    try {
      console.debug(`Activating Unity license for version ${projectInfo.editorVersion}`);

      const args = ["-quit", "-serial", serial, "-username", username, "-password", password];

      const editorInfo = { version: projectInfo.editorVersion };
      const { stdout, stderr } = await this.execUnityEditorCommand(editorInfo, args, {
        reject: false,
      });

      // Check if license activation was successful
      const activationSuccessful =
        stdout.includes("successfully activated") ||
        (!stdout.includes("License activation failed") && !stderr.includes("License activation failed"));

      if (activationSuccessful) {
        console.debug(`Successfully activated license for Unity ${projectInfo.editorVersion}`);
        return true;
      } else {
        console.error(`Failed to activate license: ${stderr || stdout}`);
        return false;
      }
    } catch (error) {
      console.error("Error activating license:", error);
      return false;
    }
  }

  /**
   * Returns a previously activated Unity license back to the license server.
   * This function should be called when finished using Unity on build servers or CI/CD pipelines
   * to free up the license seat for use elsewhere.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the project (used to determine Unity version)
   * @returns {Promise<boolean>} - Promise resolving to true if license was successfully returned, false otherwise
   * @example
   * // After completing build tasks, return the license
   * const success = await UnityEditor.returnLicense(
   *   { editorVersion: "2022.3.15f1", path: "/path/to/project" }
   * );
   *
   * if (success) {
   *   console.log("License returned successfully");
   * } else {
   *   console.error("Failed to return license");
   * }
   */
  public static async returnLicense(projectInfo: ProjectInfo): Promise<boolean> {
    try {
      console.debug(`Returning Unity license for version ${projectInfo.editorVersion}`);

      const args = ["-quit", "-returnlicense"];

      const editorInfo = { version: projectInfo.editorVersion };
      const { stdout, stderr } = await this.execUnityEditorCommand(editorInfo, args, {
        reject: false,
      });

      // Check if license return was successful
      const returnSuccessful =
        stdout.includes("license return succeeded") ||
        (!stdout.includes("Failed to return license") && !stderr.includes("Failed to return license"));

      if (returnSuccessful) {
        console.debug(`Successfully returned license for Unity ${projectInfo.editorVersion}`);
        return true;
      } else {
        console.error(`Failed to return license: ${stderr || stdout}`);
        return false;
      }
    } catch (error) {
      console.error("Error returning license:", error);
      return false;
    }
  }

  /**
   * Creates a Unity package (.unitypackage) file from specified assets in the project.
   * This function can be used to package assets for distribution or for creating
   * reusable components across multiple projects.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the source project
   * @param {string[]} assetPaths - Array of asset paths relative to the Assets folder to include in the package
   *                               (e.g., ["Prefabs/Player", "Scripts/Utils"])
   * @param {string} outputPath - Full path where the .unitypackage file should be saved
   * @returns {Promise<boolean>} - Promise resolving to true if package export was successful, false otherwise
   * @example
   * // Export a package containing UI assets and utilities
   * const success = await UnityEditor.exportPackage(
   *   { path: "/path/to/project", editorVersion: "2022.3.15f1" },
   *   ["Assets/UI", "Assets/Scripts/Utilities"],
   *   "/path/to/output/UITools.unitypackage"
   * );
   *
   * if (success) {
   *   console.log("Package exported successfully");
   * } else {
   *   console.error("Package export failed");
   * }
   */
  public static async exportPackage(
    projectInfo: ProjectInfo,
    assetPaths: string[],
    outputPath: string
  ): Promise<boolean> {
    try {
      console.debug(`Exporting package from project`);

      const args = ["-projectPath", projectInfo.projectPath, "-exportPackage", ...assetPaths, outputPath, "-quit"];

      const editorInfo = { version: projectInfo.editorVersion };
      const { stdout, stderr } = await this.execUnityEditorCommand(editorInfo, args, {
        reject: false,
      });

      // Check if package export was successful
      const exportSuccessful =
        !stdout.includes("Failed to export package") && !stderr.includes("Failed to export package");

      if (exportSuccessful) {
        console.debug(`Successfully exported package to ${outputPath}`);
        return true;
      } else {
        console.error(`Failed to export package: ${stderr || stdout}`);
        return false;
      }
    } catch (error) {
      console.error("Error exporting package:", error);
      return false;
    }
  }

  /**
   * Imports a Unity package (.unitypackage) file into a project.
   * This function can be used to install asset packages, plugins, or
   * other distributed content into a Unity project.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the target project
   * @param {string} packagePath - Full path to the .unitypackage file to import
   * @returns {Promise<boolean>} - Promise resolving to true if package import was successful, false otherwise
   * @example
   * // Import a third-party asset package into a project
   * const success = await UnityEditor.importPackage(
   *   { path: "/path/to/project", editorVersion: "2022.3.15f1" },
   *   "/path/to/downloads/AwesomeAssets.unitypackage"
   * );
   *
   * if (success) {
   *   console.log("Package imported successfully");
   * } else {
   *   console.error("Package import failed");
   * }
   *
   * @note This operation may require user intervention for Unity versions that prompt
   *       for confirmation during package import, unless run in batchmode.
   */
  public static async importPackage(projectInfo: ProjectInfo, packagePath: string): Promise<boolean> {
    try {
      console.debug(`Importing package ${packagePath} to project`);

      const args = ["-projectPath", projectInfo.projectPath, "-importPackage", packagePath, "-quit"];

      const editorInfo = { version: projectInfo.editorVersion };
      const { stdout, stderr } = await this.execUnityEditorCommand(editorInfo, args, {
        reject: false,
      });

      const importSuccessful =
        !stdout.includes("Failed to import package") && !stderr.includes("Failed to import package");

      if (importSuccessful) {
        console.debug(`Successfully imported package ${packagePath}`);
        return true;
      } else {
        console.error(`Failed to import package: ${stderr || stdout}`);
        return false;
      }
    } catch (error) {
      console.error("Error importing package:", error);
      return false;
    }
  }

  /**
   * Creates a new Unity project at the specified location.
   * This function initializes a fresh Unity project with the specified version,
   * creating the necessary folder structure and configuration files.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the project to create, including:
   *                                   - path: Where to create the project
   *                                   - editorVersion: Which Unity version to use
   * @param {boolean} [waitForExit=true] - Whether to wait for Unity to exit after creating the project
   *                                      Set to false to keep Unity open after project creation
   * @returns {Promise<boolean>} - Promise resolving to true if project creation was successful, false otherwise
   * @example
   * // Create a new project using Unity 2022.3.15f1
   * const success = await UnityEditor.createProject(
   *   {
   *     path: "/path/to/new/MyAwesomeGame",
   *     editorVersion: "2022.3.15f1"
   *   }
   * );
   *
   * if (success) {
   *   console.log("Project created successfully");
   * } else {
   *   console.error("Project creation failed");
   * }
   */
  public static async createProject(projectInfo: ProjectInfo, waitForExit: boolean = true): Promise<boolean> {
    try {
      console.debug(`Creating new project at ${projectInfo.projectPath}`);

      const parentDir = path.dirname(projectInfo.projectPath);
      await fs.ensureDir(parentDir);

      const args = ["-createProject", projectInfo.projectPath];

      if (waitForExit) args.push("-quit");

      const editorInfo = { version: projectInfo.editorVersion };
      const { stdout, stderr } = await this.execUnityEditorCommand(editorInfo, args, {
        reject: false,
      });

      const creationSuccessful =
        !stdout.includes("Failed to create project") && !stderr.includes("Failed to create project");

      if (creationSuccessful) {
        console.debug(`Successfully created project at ${projectInfo.projectPath}`);
        return true;
      } else {
        console.error(`Failed to create project: ${stderr || stdout}`);
        return false;
      }
    } catch (error) {
      console.error("Error creating project:", error);
      return false;
    }
  }

  /**
   * Opens an existing Unity project with the specified editor version.
   * This function can launch Unity with various options, either in batch mode
   * for automation or with the full UI for interactive use.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the project to open
   * @param {boolean} [useHub=true] - Whether to use Unity Hub for launching the project
   * @param {boolean} [batchmode=false] - Whether to run Unity in batch mode (headless, no UI)
   *                                     Use true for CI/CD pipelines or server environments
   * @param {boolean} [waitForExit=true] - Whether to wait for Unity to exit before resolving the promise
   *                                      Set to false for launching the editor without blocking
   * @returns {Promise<boolean>} - Promise resolving to true if project opening was successful, false otherwise
   * @example
   * // Open a project in batch mode for automated processing
   * const success = await UnityEditor.openProject(
   *   { path: "/path/to/project", editorVersion: "2022.3.15f1" },
   *   true,  // batchmode
   *   true   // waitForExit
   * );
   *
   * // Launch the editor UI for interactive use
   * await UnityEditor.openProject(
   *   { path: "/path/to/project", editorVersion: "2022.3.15f1" },
   *   false, // with UI
   *   false  // don't wait for exit
   * );
   */
  public static async openProject(
    projectInfo: ProjectInfo,
    useHub: boolean = true,
    batchmode: boolean = false,
    waitForExit: boolean = true
  ): Promise<boolean> {
    try {
      console.debug(`Opening project at ${projectInfo.projectPath}`);

      const args = ["-projectPath", projectInfo.projectPath];

      if (waitForExit) args.push("-quit");
      if (batchmode) args.push("-batchmode");
      if (useHub) args.push(...["-useHub", "-hubIPC"]);

      const editorInfo = { version: projectInfo.editorVersion };
      const options = { reject: false };

      const { stdout, stderr } = await this.execUnityEditorCommand(editorInfo, args, options);

      const openingSuccessful =
        !stdout.includes("Failed to open project") && !stderr.includes("Failed to open project");

      if (openingSuccessful) {
        console.debug(`Successfully opened project`);
      } else {
        console.error(`Failed to open project: ${stderr || stdout}`);
      }

      return openingSuccessful;
    } catch (error) {
      console.error("Error opening project:", error);
      return false;
    }
  }
}

export default UnityEditor;
