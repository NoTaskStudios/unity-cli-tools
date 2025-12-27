import os from "os";
import fs from "fs-extra";
import path from "path";
import { ProjectInfo, TestMode, UnityBuildTarget, UnityEditorInfo } from "./types/unity.js";
import { CommandOptions, CommandOutput, executeCommand } from "./utils/commandExecutor.js";
import { redactSensitiveArgs } from "./utils/security.js";
import {
  Result,
  ok,
  err,
  UnityEditorNotFoundError,
  UnityCommandError,
  UnityTestError,
  UnityLicenseError,
  UnityPackageError,
  UnityProjectError,
} from "./errors/index.js";

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
    },
    darwin: {
      base: "/Applications/Unity/Hub/Editor",
      executable: "Unity.app/Contents/MacOS/Unity",
    },
    linux: {
      base: "/opt/unity/editor",
      executable: "Editor/Unity",
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
   * @returns {Promise<Result<CommandOutput>>} Result containing command output or error
   */
  public static async execUnityEditorCommand(
    editorInfo: UnityEditorInfo,
    args: string[],
    options: CommandOptions = {}
  ): Promise<Result<CommandOutput, UnityEditorNotFoundError | UnityCommandError>> {
    const unityPath = this.getUnityExecutablePath(editorInfo.version);

    if (!fs.existsSync(unityPath)) {
      return err(new UnityEditorNotFoundError(editorInfo.version, unityPath));
    }

    const editorArgs = [...args];
    const redactedArgs = redactSensitiveArgs(editorArgs);

    console.debug(`Executing Unity Editor command: ${unityPath} ${redactedArgs.join(" ")}`);

    return await executeCommand(unityPath, editorArgs, options);
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
   * @returns {Promise<Result<CommandOutput>>} Result containing method output or error
   * @example
   * // Execute a build method defined in a custom editor script
   * const result = await UnityEditor.executeMethod(
   *   { projectPath: "/path/to/project", editorVersion: "2022.3.15f1", projectName: "MyGame" },
   *   "MyCompany.BuildTools.PerformBuild"
   * );
   * if (result.success) {
   *   console.log("Method executed successfully:", result.value.stdout);
   * }
   */
  public static async executeMethod(
    projectInfo: ProjectInfo,
    method: string,
    args: string[] = [],
    options: CommandOptions = {}
  ): Promise<Result<CommandOutput, UnityEditorNotFoundError | UnityCommandError>> {
    console.debug(`Executing method ${method} in Unity Editor`);

    const unityPath = this.getUnityExecutablePath(projectInfo.editorVersion);
    const editorArgs = ["-projectPath", projectInfo.projectPath, "-executeMethod", method, ...args];

    const result = await this.execUnityEditorCommand(
      { version: projectInfo.editorVersion, path: unityPath },
      editorArgs,
      options
    );

    if (!result.success) {
      console.error(`Error executing method: ${result.error.message}`);
      return result;
    }

    if (result.value.stderr) {
      console.error(`Error executing method: ${result.value.stderr}`);
      return err(
        new UnityCommandError(
          `Error executing method ${method}: ${result.value.stderr}`,
          result.value.stdout,
          result.value.stderr,
          result.value.exitCode,
          { method, projectInfo }
        )
      );
    }

    return result;
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
   * @returns {Promise<Result<string>>} Result containing test output if all tests passed, or UnityTestError if tests failed
   * @example
   * // Run all PlayMode tests in the "Performance" category
   * const result = await UnityEditor.runTests(
   *   { projectPath: "/path/to/project", editorVersion: "2022.3.15f1", projectName: "MyGame" },
   *   TestMode.PlayMode,
   *   "Performance"
   * );
   *
   * if (result.success) {
   *   console.log("All tests passed! Output:", result.value);
   * } else {
   *   console.error("Tests failed:", result.error.message);
   *   console.error("Test output:", result.error.testOutput);
   * }
   */
  public static async runTests(
    projectInfo: ProjectInfo,
    testPlatform: TestMode | UnityBuildTarget = TestMode.EditMode,
    testCategory?: string
  ): Promise<Result<string, UnityEditorNotFoundError | UnityCommandError | UnityTestError>> {
    console.debug(`Running ${testPlatform} tests for project${testCategory ? ` in category ${testCategory}` : ""}`);

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
    const result = await this.execUnityEditorCommand(editorInfo, args, {
      reject: false,
    });

    if (!result.success) {
      return result;
    }

    const { stdout, stderr } = result.value;
    const testsFailed =
      stdout.includes("Some tests failed") || stdout.includes("Test run failed") || stderr.includes("Test run failed");

    if (testsFailed) {
      return err(
        new UnityTestError("Some tests failed", stdout, {
          projectInfo,
          testPlatform,
          testCategory,
        })
      );
    }

    return ok(stdout);
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
   * @returns {Promise<Result<void>>} Result indicating success or license activation error
   * @example
   * // Activate a Unity Pro license
   * const result = await UnityEditor.activateLicense(
   *   { editorVersion: "2022.3.15f1", projectPath: "/path/to/project", projectName: "MyGame" },
   *   "XXXX-XXXX-XXXX-XXXX-XXXX",
   *   "username@example.com",
   *   "password123"
   * );
   *
   * if (result.success) {
   *   console.log("License activated successfully");
   * } else {
   *   console.error("License activation failed:", result.error.message);
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
  ): Promise<Result<void, UnityEditorNotFoundError | UnityCommandError | UnityLicenseError>> {
    console.debug(`Activating Unity license for version ${projectInfo.editorVersion}`);

    const args = ["-quit", "-serial", serial, "-username", username, "-password", password];

    const editorInfo = { version: projectInfo.editorVersion };
    const result = await this.execUnityEditorCommand(editorInfo, args, {
      reject: false,
    });

    if (!result.success) {
      return result;
    }

    const { stdout, stderr } = result.value;
    const activationSuccessful =
      stdout.includes("successfully activated") ||
      (!stdout.includes("License activation failed") && !stderr.includes("License activation failed"));

    if (activationSuccessful) {
      console.debug(`Successfully activated license for Unity ${projectInfo.editorVersion}`);
      return ok(undefined);
    }

    return err(
      new UnityLicenseError(`Failed to activate license: ${stderr || stdout}`, {
        projectInfo,
        stderr,
        stdout,
      })
    );
  }

  /**
   * Returns a previously activated Unity license back to the license server.
   * This function should be called when finished using Unity on build servers or CI/CD pipelines
   * to free up the license seat for use elsewhere.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the project (used to determine Unity version)
   * @returns {Promise<Result<void>>} Result indicating success or license return error
   * @example
   * // After completing build tasks, return the license
   * const result = await UnityEditor.returnLicense(
   *   { editorVersion: "2022.3.15f1", projectPath: "/path/to/project", projectName: "MyGame" }
   * );
   *
   * if (result.success) {
   *   console.log("License returned successfully");
   * } else {
   *   console.error("Failed to return license:", result.error.message);
   * }
   */
  public static async returnLicense(
    projectInfo: ProjectInfo
  ): Promise<Result<void, UnityEditorNotFoundError | UnityCommandError | UnityLicenseError>> {
    console.debug(`Returning Unity license for version ${projectInfo.editorVersion}`);

    const args = ["-quit", "-returnlicense"];

    const editorInfo = { version: projectInfo.editorVersion };
    const result = await this.execUnityEditorCommand(editorInfo, args, {
      reject: false,
    });

    if (!result.success) {
      return result;
    }

    const { stdout, stderr } = result.value;
    const returnSuccessful =
      stdout.includes("license return succeeded") ||
      (!stdout.includes("Failed to return license") && !stderr.includes("Failed to return license"));

    if (returnSuccessful) {
      console.debug(`Successfully returned license for Unity ${projectInfo.editorVersion}`);
      return ok(undefined);
    }

    return err(
      new UnityLicenseError(`Failed to return license: ${stderr || stdout}`, {
        projectInfo,
        stderr,
        stdout,
      })
    );
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
   * @returns {Promise<Result<void>>} Result indicating success or package export error
   * @example
   * // Export a package containing UI assets and utilities
   * const result = await UnityEditor.exportPackage(
   *   { projectPath: "/path/to/project", editorVersion: "2022.3.15f1", projectName: "MyGame" },
   *   ["Assets/UI", "Assets/Scripts/Utilities"],
   *   "/path/to/output/UITools.unitypackage"
   * );
   *
   * if (result.success) {
   *   console.log("Package exported successfully");
   * } else {
   *   console.error("Package export failed:", result.error.message);
   * }
   */
  public static async exportPackage(
    projectInfo: ProjectInfo,
    assetPaths: string[],
    outputPath: string
  ): Promise<Result<void, UnityEditorNotFoundError | UnityCommandError | UnityPackageError>> {
    console.debug(`Exporting package from project`);

    const args = ["-projectPath", projectInfo.projectPath, "-exportPackage", ...assetPaths, outputPath, "-quit"];

    const editorInfo = { version: projectInfo.editorVersion };
    const result = await this.execUnityEditorCommand(editorInfo, args, {
      reject: false,
    });

    if (!result.success) {
      return result;
    }

    const { stdout, stderr } = result.value;
    const exportSuccessful =
      !stdout.includes("Failed to export package") && !stderr.includes("Failed to export package");

    if (exportSuccessful) {
      console.debug(`Successfully exported package to ${outputPath}`);
      return ok(undefined);
    }

    return err(
      new UnityPackageError(`Failed to export package: ${stderr || stdout}`, {
        projectInfo,
        assetPaths,
        outputPath,
        stderr,
        stdout,
      })
    );
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
   * @returns {Promise<Result<void>>} Result indicating success or package import error
   * @example
   * // Import a third-party asset package into a project
   * const result = await UnityEditor.importPackage(
   *   { projectPath: "/path/to/project", editorVersion: "2022.3.15f1", projectName: "MyGame" },
   *   "/path/to/downloads/AwesomeAssets.unitypackage"
   * );
   *
   * if (result.success) {
   *   console.log("Package imported successfully");
   * } else {
   *   console.error("Package import failed:", result.error.message);
   * }
   *
   * @note This operation may require user intervention for Unity versions that prompt
   *       for confirmation during package import, unless run in batchmode.
   */
  public static async importPackage(
    projectInfo: ProjectInfo,
    packagePath: string
  ): Promise<Result<void, UnityEditorNotFoundError | UnityCommandError | UnityPackageError>> {
    console.debug(`Importing package ${packagePath} to project`);

    const args = ["-projectPath", projectInfo.projectPath, "-importPackage", packagePath, "-quit"];

    const editorInfo = { version: projectInfo.editorVersion };
    const result = await this.execUnityEditorCommand(editorInfo, args, {
      reject: false,
    });

    if (!result.success) {
      return result;
    }

    const { stdout, stderr } = result.value;
    const importSuccessful =
      !stdout.includes("Failed to import package") && !stderr.includes("Failed to import package");

    if (importSuccessful) {
      console.debug(`Successfully imported package ${packagePath}`);
      return ok(undefined);
    }

    return err(
      new UnityPackageError(`Failed to import package: ${stderr || stdout}`, {
        projectInfo,
        packagePath,
        stderr,
        stdout,
      })
    );
  }

  /**
   * Creates a new Unity project at the specified location.
   * This function initializes a fresh Unity project with the specified version,
   * creating the necessary folder structure and configuration files.
   *
   * @public
   * @static
   * @param {ProjectInfo} projectInfo - Information about the project to create, including:
   *                                   - projectPath: Where to create the project
   *                                   - editorVersion: Which Unity version to use
   * @param {boolean} [waitForExit=true] - Whether to wait for Unity to exit after creating the project
   *                                      Set to false to keep Unity open after project creation
   * @returns {Promise<Result<void>>} Result indicating success or project creation error
   * @example
   * // Create a new project using Unity 2022.3.15f1
   * const result = await UnityEditor.createProject(
   *   {
   *     projectPath: "/path/to/new/MyAwesomeGame",
   *     editorVersion: "2022.3.15f1",
   *     projectName: "MyAwesomeGame"
   *   }
   * );
   *
   * if (result.success) {
   *   console.log("Project created successfully");
   * } else {
   *   console.error("Project creation failed:", result.error.message);
   * }
   */
  public static async createProject(
    projectInfo: ProjectInfo,
    waitForExit: boolean = true
  ): Promise<Result<void, UnityEditorNotFoundError | UnityCommandError | UnityProjectError>> {
    console.debug(`Creating new project at ${projectInfo.projectPath}`);

    try {
      const parentDir = path.dirname(projectInfo.projectPath);
      await fs.ensureDir(parentDir);

      const args = ["-createProject", projectInfo.projectPath];

      if (waitForExit) {
        args.push("-quit");
      }

      const editorInfo = { version: projectInfo.editorVersion };
      const result = await this.execUnityEditorCommand(editorInfo, args, {
        reject: false,
      });

      if (!result.success) {
        return result;
      }

      const { stdout, stderr } = result.value;
      const creationSuccessful =
        !stdout.includes("Failed to create project") && !stderr.includes("Failed to create project");

      if (creationSuccessful) {
        console.debug(`Successfully created project at ${projectInfo.projectPath}`);
        return ok(undefined);
      }

      return err(
        new UnityProjectError(`Failed to create project: ${stderr || stdout}`, {
          projectInfo,
          stderr,
          stdout,
        })
      );
    } catch (error) {
      console.error("Error creating project:", error);
      return err(new UnityProjectError(`Error creating project: ${String(error)}`, { projectInfo }));
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
   * @returns {Promise<Result<void>>} Result indicating success or project opening error
   * @example
   * // Open a project in batch mode for automated processing
   * const result = await UnityEditor.openProject(
   *   { projectPath: "/path/to/project", editorVersion: "2022.3.15f1", projectName: "MyGame" },
   *   true,  // useHub
   *   true,  // batchmode
   *   true   // waitForExit
   * );
   *
   * if (result.success) {
   *   console.log("Project opened successfully");
   * } else {
   *   console.error("Failed to open project:", result.error.message);
   * }
   */
  public static async openProject(
    projectInfo: ProjectInfo,
    useHub: boolean = true,
    batchmode: boolean = false,
    waitForExit: boolean = true
  ): Promise<Result<void, UnityEditorNotFoundError | UnityCommandError | UnityProjectError>> {
    console.debug(`Opening project at ${projectInfo.projectPath}`);

    const args = ["-projectPath", projectInfo.projectPath];

    if (waitForExit) {
      args.push("-quit");
    }

    if (batchmode) {
      args.push("-batchmode");
    }

    if (useHub) {
      args.push("-useHub", "-hubIPC");
    }

    const editorInfo = { version: projectInfo.editorVersion };
    const result = await this.execUnityEditorCommand(editorInfo, args, { reject: false });

    if (!result.success) {
      return result;
    }

    const { stdout, stderr } = result.value;
    const openingSuccessful =
      !stdout.includes("Failed to open project") && !stderr.includes("Failed to open project");

    if (openingSuccessful) {
      console.debug(`Successfully opened project`);
      return ok(undefined);
    }

    return err(
      new UnityProjectError(`Failed to open project: ${stderr || stdout}`, {
        projectInfo,
        stderr,
        stdout,
      })
    );
  }
}

export default UnityEditor;
