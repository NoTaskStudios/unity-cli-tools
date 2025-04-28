export type UnityEditorInfo = Record<string, string>;

export interface UnityHubProject {
  title: string;
  lastModified: number;
  isCustomEditor: boolean;
  path: string;
  containingFolderPath: string;
  version: string;
  architecture: string;
  changeset: string;
  isFavorite: boolean;
  localProjectId: string;
  cloudEnabled: boolean;
}

export interface UnityHubProjectsList {
  data: UnityHubProject[];
}

export enum UnityModules {
  Documentation = "documentation",
  AndroidBuildSupport = "android",
  AndroidSDKNDKTools = "android-sdk-ndk-tools",
  OpenJDK = "android-open-jdk",
  IOSBuildSupport = "ios",
  TvOSBuildSupport = "appletv",
  LinuxBuildSupportMono = "linux-mono",
  LinuxBuildSupportIL2CPP = "linux-il2cpp",
  WebGLBuildSupport = "webgl",
  WindowsBuildSupport = "windows",
  VuforiaAR = "vuforia-ar",
  WindowsBuildSupportMono = "windows-mono",
  LuminBuildSupport = "lumin",
  VisualStudioCommunity = "visualstudio",
  MacBuildSupportMono = "mac-mono",
  MacBuildSupportIL2CPP = "mac-il2cpp",
  UniversalWindowsPlatform = "universal-windows-platform",
  UWPBuildSupportIL2CPP = "uwp-il2cpp",
  UWPBuildSupportDotNet = "uwp-.net",
}

export enum UnityEditorLanguages {
  Japanese = "language-ja",
  Korean = "language-ko",
  ChineseSimplified = "language-zh-hans",
  ChineseTraditional = "language-zh-hant",
  Chinese = "language-zh-cn",
}

export enum EditorArchitecture {
  x86_64 = "x86_64",
  arm64 = "arm64",
}

export type ModuleId = UnityModules | UnityEditorLanguages;
export type UnityInstallations = Record<string, string>;

//EDITOR
export interface ProjectInfo {
  projectName: string;
  projectPath: string;
  editorVersion: string;
  scenes?: string[];
}

// Ref https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line.html#testplatform
export enum TestMode {
  EditMode = "editmode",
  PlayMode = "playmode",
}

// Ref: https://docs.unity3d.com/ScriptReference/BuildTarget.html
export enum UnityBuildTarget {
  StandaloneOSX = "StandaloneOSX",
  StandaloneWindows = "StandaloneWindows",
  iOS = "iOS",
  Android = "Android",
  StandaloneWindows64 = "StandaloneWindows64",
  WebGL = "WebGL",
  WSAPlayer = "WSAPlayer",
  StandaloneLinux64 = "StandaloneLinux64",
  PS4 = "PS4",
  XboxOne = "XboxOne",
  tvOS = "tvOS",
  Switch = "Switch",
  LinuxHeadlessSimulation = "LinuxHeadlessSimulation",
  PS5 = "PS5",
  VisionOS = "VisionOS",
}
