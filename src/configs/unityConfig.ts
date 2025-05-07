import os from "os";
import path from "path";

/**
 * Interface for Unity Hub paths
 */
interface UnityHubPaths {
  /** Path to the Unity Hub executable */
  hub: string;

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

/**
 * Interface for platform-specific Unity configuration
 */
interface PlatformConfig {
  /** The path to the Unity Editor executable */
  editor: UnityEditorPaths;

  /** The path to the Unity Hub executable */
  hub: UnityHubPaths;

  /** The platform name (e.g., "win32", "darwin", "linux") */
  platform: string;

  /** CPU architecture of the Unity editor (e.g., "x86_64") */
  architecture: string;
}

