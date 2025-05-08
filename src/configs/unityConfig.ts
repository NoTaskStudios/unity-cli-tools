import os from "os";
import path from "path";

/**
 * Interface for Unity Hub paths
 */
interface UnityHubPaths {
  /** Path to the Unity Hub executable */
  hubDir: string;

  /** Path to the Unity Hub projects list file */
  projects: string;

  /** Path to the Unity Hub default projects directory */
  projectDir: string;
}

/**
 * Interface for Unity Editor paths
 */
interface UnityEditorPaths {
  /** Base path to the Unity Editor installation */
  base: string;

  /** Path to the Unity Editor executable */
  executable: string;

  /** Path to the Unity Editor project templates */
  projectTemplates: string;
}

interface UnityTemplatePaths {
  /** Path to the Unity project templates */
  projectTemplates: string;
}

/**
 * Interface for platform-specific Unity configuration
 */
interface PlatformConfig {
  /** The path to the Unity Editor executable */
  editor: UnityEditorPaths;

  /** The path to the Unity Hub executable */
  hub: UnityHubPaths;

  /** The path to the Unity project templates */
  templates: UnityTemplatePaths;

  /** The platform name (e.g., "win32", "darwin", "linux") */
  platform: string;

  /** CPU architecture of the Unity editor (e.g., "x86_64") */
  architecture: string;
}

/**
 * Platform-specific paths for Unity Hub components
 */
const UNITY_HUB_PATHS: Record<string, UnityHubPaths> = {
  win32: {
    hubDir: "C:\\Program Files\\Unity Hub\\Unity Hub.exe",
    projects: path.join(os.homedir(), "AppData", "Roaming", "UnityHub", "projects-v1.json"),
    projectDir: path.join(os.homedir(), "AppData", "Roaming", "UnityHub", "projectDir.json"),
  },
  darwin: {
    hubDir: "/Applications/Unity Hub.app/Contents/MacOS/Unity Hub",
    projects: path.join(os.homedir(), "Library", "Application Support", "UnityHub", "projects-v1.json"),
    projectDir: path.join(os.homedir(), "Library", "Application Support", "UnityHub", "projectDir.json"),
  },
  linux: {
    hubDir: "/opt/UnityHub/UnityHub",
    projects: path.join(os.homedir(), ".config", "UnityHub", "projects-v1.json"),
    projectDir: path.join(os.homedir(), ".config", "UnityHub", "projectDir.json"),
  },
};

/**
 * Configuration paths for Unity Editor executables across different operating systems.
 * The structure provides base installation directories and relative paths to the
 * executable for each supported platform (Windows, macOS, Linux).
 */
const UNITY_EDITOR_PATHS: Record<string, UnityEditorPaths> = {
  win32: {
    base: "C:/Program Files/Unity/Hub/Editor",
    executable: "Editor/Unity.exe",
    projectTemplates: "Editor/Data/Resources/PackageManager/ProjectTemplates",
  },
  darwin: {
    base: "/Applications/Unity/Hub/Editor",
    executable: "Unity.app/Contents/MacOS/Unity",
    projectTemplates: "Unity.app/Contents/Resources/PackageManager/ProjectTemplates",
  },
  linux: {
    base: "/opt/unity/editor",
    executable: "Editor/Unity",
    projectTemplates: "Editor/Data/Resources/PackageManager/ProjectTemplates",
  },
};

class UnityConfig {
  /**
   * Gets the current platform configuration
   * @returns The platform-specific Unity paths configuration
   */
  public static getPlatformConfig(): PlatformConfig {
    const platform = process.platform;
    const unityHubPaths = UNITY_HUB_PATHS[platform];
    const unityEditorPaths = UNITY_EDITOR_PATHS[platform];

    const settings: PlatformConfig = {
      editor: {
        base: environment.unityEditorPath ?? unityEditorPaths.base,
        executable: unityEditorPaths.executable,
        projectTemplates: unityEditorPaths.projectTemplates,
      },
      hub: {
        hubDir: environment.unityHubPath ?? unityHubPaths.hubDir,
        projects: unityHubPaths.projects,
        projectDir: unityHubPaths.projectDir,
      },
      templates: {
        projectTemplates: environment.unityProjectTemplatePath ?? unityEditorPaths.projectTemplates,
      },
      platform,
      architecture: os.arch(),
    };

    return settings;
  }
}

const environment = {
  unityHubPath: process.env.UNITY_HUB_PATH,
  unityEditorPath: process.env.UNITY_EDITOR_PATH,
  unityProjectPath: process.env.UNITY_PROJECT_PATH,
  unityProjectTemplatePath: process.env.UNITY_PROJECT_TEMPLATE_PATH,
};

export { UnityConfig };
export type { UnityHubPaths, UnityEditorPaths, UnityTemplatePaths, PlatformConfig };
