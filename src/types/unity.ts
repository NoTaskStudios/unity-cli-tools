/**
 * Interface representing a Unity project as stored in Unity Hub
 * Contains metadata about a project tracked by Unity Hub
 */
export interface UnityHubProject {
  /** Project name */
  title: string;

  /** Timestamp of last modification (in milliseconds since epoch) */
  lastModified: number;

  /** Whether the project uses a custom editor (non-standard Unity version) */
  isCustomEditor: boolean;

  /** Full path to the project folder */
  path: string;

  /** Path to the parent folder containing the project */
  containingFolderPath: string;

  /** Unity version used by the project (e.g., "2023.3.0f1") */
  version: string;

  /** CPU architecture of the Unity editor (e.g., "x64") */
  architecture: string;

  /** Specific Unity changeset hash for this version */
  changeset: string;

  /** Whether the project is marked as favorite in Unity Hub */
  isFavorite: boolean;

  /** Unique identifier for the project used locally */
  localProjectId: string;

  /** Whether Unity Cloud services are enabled for this project */
  cloudEnabled: boolean;
}

/**
 * Interface representing the structure of the Unity Hub projects list file
 * Contains an array of Unity projects tracked by Unity Hub
 */
export interface UnityHubProjectsList {
  /** Array of Unity projects */
  data: UnityHubProject[];
}

export enum UnityModules {
  /** Unity documentation */
  Documentation = "documentation",

  /** Android build support module */
  AndroidBuildSupport = "android",

  /** Android SDK and NDK tools child modules */
  AndroidSDKNDKTools = "android-sdk-ndk-tools",

  /** OpenJDK for Android development */
  OpenJDK = "android-open-jdk",

  /** iOS build support module */
  IOSBuildSupport = "ios",

  /** tvOS build support module */
  TvOSBuildSupport = "appletv",

  /** Linux build support with Mono scripting backend */
  LinuxBuildSupportMono = "linux-mono",

  /** Linux build support with IL2CPP scripting backend */
  LinuxBuildSupportIL2CPP = "linux-il2cpp",

  /** WebGL build support module */
  WebGLBuildSupport = "webgl",

  /** Generic Windows build support */
  WindowsBuildSupport = "windows",

  /** Vuforia Augmented Reality support */
  VuforiaAR = "vuforia-ar",

  /** Windows build support with Mono scripting backend */
  WindowsBuildSupportMono = "windows-mono",

  /** Lumin (Magic Leap) build support */
  LuminBuildSupport = "lumin",

  /** Visual Studio Community integration */
  VisualStudioCommunity = "visualstudio",

  /** macOS build support with Mono scripting backend */
  MacBuildSupportMono = "mac-mono",

  /** macOS build support with IL2CPP scripting backend */
  MacBuildSupportIL2CPP = "mac-il2cpp",

  /** Universal Windows Platform support */
  UniversalWindowsPlatform = "universal-windows-platform",

  /** Universal Windows Platform build support with IL2CPP */
  UWPBuildSupportIL2CPP = "uwp-il2cpp",

  /** Universal Windows Platform build support with .NET */
  UWPBuildSupportDotNet = "uwp-.net",
}

/**
 * Enum for language packs that can be installed for Unity Editor
 * These values correspond to the language module IDs used in Unity Hub CLI commands
 */
export enum UnityEditorLanguages {
  /** Japanese language pack */
  Japanese = "language-ja",

  /** Korean language pack */
  Korean = "language-ko",

  /** Simplified Chinese language pack */
  ChineseSimplified = "language-zh-hans",

  /** Traditional Chinese language pack */
  ChineseTraditional = "language-zh-hant",

  /** Chinese language pack (mainland China) */
  Chinese = "language-zh-cn",
}

/**
 * Enum for Unity Editor architectures
 * These values correspond to the architecture module IDs used in Unity Hub CLI commands
 */
export enum EditorArchitecture {
  x86_64 = "x86_64",
  arm64 = "arm64",
}

/**
 * Union type for all Unity module IDs (both regular modules and language packs)
 * Used when adding modules to Unity installations
 */
export type ModuleId = UnityModules | UnityEditorLanguages;

export type UnityInstallations = Record<string, string>;

/**
 * Type representing a mapping of Unity versions to their installation paths
 * Example: { "2023.3.0f1": "C:/Program Files/Unity/Hub/Editor/2023.3.0f1" }
 */
export type UnityEditorInfo = Record<string, string>;

//EDITOR

export interface ProjectInfo {
  projectName: string;
  projectPath: string;
  editorVersion: string;
}

//
/** Enum for Unity test platforms
 * These values correspond to the test platform options used in Unity CLI commands
 * and are used to specify the type for running tests.
 * @link https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line.html#testplatform
 */
export enum TestMode {
  /** Play mode test platform */
  EditMode = "editmode",
  /** Play mode test platform */
  PlayMode = "playmode",
}

/**
 * Enum for Unity build targets
 * These values correspond to the build target options used in Unity CLI commands
 * @link https://docs.unity3d.com/ScriptReference/BuildTarget.html
 */
export enum UnityBuildTarget {
  /** Standalone OS X build target */
  StandaloneOSX = "StandaloneOSX",

  /** Standalone Windows build target */
  StandaloneWindows = "StandaloneWindows",

  /** iOS build target */
  iOS = "iOS",

  /** Android build target */
  Android = "Android",

  /** Standalone Windows 64-bit build target */
  StandaloneWindows64 = "StandaloneWindows64",

  /** WebGL build target */
  WebGL = "WebGL",

  /** Windows Store App build target */
  WSAPlayer = "WSAPlayer",

  StandaloneLinux64 = "StandaloneLinux64",

  /** PlayStation 4 build target */
  PS4 = "PS4",

  /** Xbox One build target */
  XboxOne = "XboxOne",

  /** tvOS build target */
  tvOS = "tvOS",

  /** Switch build target */
  Switch = "Switch",

  /** Linux Headless build target */
  LinuxHeadlessSimulation = "LinuxHeadlessSimulation",

  /** PlayStation 5 build target */
  PS5 = "PS5",

  /** VisionOS build target */
  VisionOS = "VisionOS",
}
