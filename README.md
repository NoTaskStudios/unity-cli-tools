# Unity Command line Tools

A TypeScript library for programmatically interacting with Unity Hub and Unity Editor command line interfaces.

## Installation

```bash
npm install @notask/unity-cli-tools
```

## Dual Module Support

This package publishes separate builds for both ES Modules (ESM) and CommonJS (CJS). You can consume it either way:

**ESM** (Node and bundlers):
```ts
import { UnityHub } from "@notask/unity-cli-tools";
```

**CJS**:
```js
const { UnityHub } = require("@notask/unity-cli-tools");
```

## Requirements

- Node.js 20+
- Unity Hub installed
- Unity Editor (for editor operations)

## Core Concepts

Unity CLI Tools provides two main modules:

- `UnityHub` - For interacting with Unity Hub
- `UnityEditor` - For interacting with Unity Editor (documentation coming soon)

## UnityHub API Reference

### Checking Availability

```typescript
import { UnityHub } from "unity-cli-tools";

// Check if Unity Hub is available
const isAvailable = await UnityHub.isUnityHubAvailable();
```

### Finding Unity Installations

```typescript
// Get all installed Unity versions
const installations = await UnityHub.getUnityInstallations();
// Returns: { '2022.3.60f1': 'C:/Program Files/Unity/Hub/Editor/2022.3.60f1', ... }
```

### Managing Unity Versions

```typescript
import { UnityHub, UnityModules } from "unity-cli-tools";

// Install a new Unity version
await UnityHub.addEditor("2022.3.60f1");

// Install with specific modules
await UnityHub.addEditor("2022.3.60f1", undefined, [UnityModules.AndroidBuildSupport, UnityModules.WebGLBuildSupport]);

// Add modules to existing installation
await UnityHub.addModule("2022.3.60f1", [UnityModules.IOSBuildSupport]);
```

### Installation Events

```typescript
import { UnityHub, UnityModules, InstallerEventType } from "unity-cli-tools";

// Install with event tracking (addEditor returns an event emitter)
const installer = await UnityHub.addEditor("2022.3.60f1");

// Get a promise that resolves when installation completes
const installation = installer.completed;

// Or listen to specific events
installer.on(InstallerEventType.Progress, (events) => {
  console.log("Progress:", events.map(e => `${e.module}: ${e.status} ${e.progress || 0}%`));
});

installer.on(InstallerEventType.Error, (error) => {
  console.error("Installation error:", error);
});

installer.on(InstallerEventType.Completed, (events) => {
  console.log("Installation completed!");
});

// Cancel installation if needed
installer.Cancel();
```

### Projects Management

```typescript
// Get projects from Unity Hub
const projects = await UnityHub.getProjects();
// Returns: [{ name: 'ProjectName', path: '/path/to/project', version: '2022.3.60f1' }, ...]

// Get default projects directory
const defaultDir = await UnityHub.getDefaultProjectsDirectory();
```

### Custom Commands

```typescript
// Execute any Hub command directly
const result = await UnityHub.execUnityHubCommand(["editors", "-r"]);
console.log(result.stdout);
```

## UnityEditor API Reference

UnityEditor provides an interface for automating tasks directly in the Unity Editor:

### Installation and Availability
```typescript
import UnityEditor from "@notask/unity-cli-tools";

// Get the executable path and verify installation
const unityPath = UnityEditor.getUnityExecutablePath("2022.3.15f1");
const isInstalled = await UnityEditor.isUnityVersionInstalled("2022.3.15f1");
console.log(`Installed: ${isInstalled}`, unityPath);
```

### Executing Raw Editor Commands
```typescript
import { CommandResult } from "@notask/unity-cli-tools";

const editorInfo = { version: "2022.3.15f1", path: unityPath };
const result: CommandResult = await UnityEditor.execUnityEditorCommand(
  editorInfo,
  ["-batchmode", "-quit", "-projectPath", "/path/to/project"]
);
console.log(result.stdout);
```

### Creating and Opening Projects
```typescript
import { ProjectInfo } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectPath: "/path/to/new/project",
  editorVersion: "2022.3.15f1"
};

await UnityEditor.createProject(projectInfo);
await UnityEditor.openProject(projectInfo, true, true);
```

### Running Tests
```typescript
import { ProjectInfo, TestMode } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectPath: "/path/to/project",
  editorVersion: "2022.3.15f1"
};

const { success, output } = await UnityEditor.runTests(projectInfo, TestMode.EditMode);
console.log(success ? "Tests passed" : "Tests failed", output);
```

### License Management
```typescript
import { ProjectInfo } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectPath: "/path/to/project",
  editorVersion: "2022.3.15f1"
};

await UnityEditor.activateLicense(projectInfo, "XXXX-XXXX-XXXX-XXXX-XXXX", "user@example.com", "password");
await UnityEditor.returnLicense(projectInfo);
```

### Importing and Exporting Packages
```typescript
import { ProjectInfo } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectPath: "/path/to/project",
  editorVersion: "2022.3.15f1"
};

await UnityEditor.exportPackage(
  projectInfo,
  ["Assets/UI", "Assets/Scripts"],
  "/path/to/output/MyPackage.unitypackage"
);
await UnityEditor.importPackage(
  projectInfo,
  "/path/to/downloads/OtherPackage.unitypackage"
);
```

### Executing Custom Editor Methods
```typescript
import { ProjectInfo } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectPath: "/path/to/project",
  editorVersion: "2022.3.15f1"
};

const executionResult = await UnityEditor.executeMethod(
  projectInfo,
  "MyCompany.BuildTools.PerformBuild"
);
console.log(executionResult);
```

## Available Constants

### UnityModules

| Constant                   | Description               |
| -------------------------- | ------------------------- |
| `Documentation`            | Unity documentation       |
| `AndroidBuildSupport`      | Android platform support  |
| `AndroidSDKNDKTools`       | Android SDK/NDK tools     |
| `OpenJDK`                  | Java Development Kit      |
| `IOSBuildSupport`          | iOS platform support      |
| `TvOSBuildSupport`         | tvOS platform support     |
| `LinuxBuildSupportMono`    | Linux Mono support        |
| `LinuxBuildSupportIL2CPP`  | Linux IL2CPP support      |
| `WebGLBuildSupport`        | WebGL platform support    |
| `WindowsBuildSupport`      | Windows platform support  |
| `VuforiaAR`                | Vuforia AR support        |
| `WindowsBuildSupportMono`  | Windows Mono support      |
| `LuminBuildSupport`        | Magic Leap support        |
| `VisualStudioCommunity`    | Visual Studio integration |
| `MacBuildSupportMono`      | macOS Mono support        |
| `MacBuildSupportIL2CPP`    | macOS IL2CPP support      |
| `UniversalWindowsPlatform` | UWP support               |
| `UWPBuildSupportIL2CPP`    | UWP IL2CPP support        |
| `UWPBuildSupportDotNet`    | UWP .NET support          |

### UnityLanguages

| Constant             | Description                       |
| -------------------- | --------------------------------- |
| `Japanese`           | Japanese language pack            |
| `Korean`             | Korean language pack              |
| `ChineseSimplified`  | Simplified Chinese language pack  |
| `ChineseTraditional` | Traditional Chinese language pack |
| `Chinese`            | Chinese language pack (legacy)    |

### InstallerStatus

| Constant           | Description                     |
| ------------------ | ------------------------------- |
| `Queued`           | Queued for download            |
| `Validating`       | Validating download            |
| `InProgress`       | Installation in progress       |
| `Downloading`      | Downloading installation files |
| `QueuedInstall`    | Queued for install            |
| `ValidatingInstall`| Validating installation        |
| `Installing`       | Installing                     |
| `Verifying`        | Verifying installation         |
| `Installed`        | Installed successfully         |
| `Error`            | Installation error             |

### InstallerEventType

| Constant     | Description                                 |
| ------------ | ------------------------------------------- |
| `Progress`   | Installation progress update event          |
| `Error`      | Installation error event                    |
| `Completed`  | Installation completed successfully event   |
| `Cancelled`  | Installation cancelled by user event        |


## Configuration

### Environment Variables

- `UNITY_HUB_PATH` - Custom path to Unity Hub executable

### Platform Detection

The library automatically detects and uses the correct paths for:

- Windows
- macOS
- Linux

## Examples

### Complete Unity Hub Workflow

```typescript
import { UnityHub, UnityModules } from "unity-cli-tools";

async function manageUnityInstallation() {
  try {
    // Check if hub is available
    const isAvailable = await UnityHub.isUnityHubAvailable();
    if (!isAvailable) {
      console.error("Unity Hub not found");
      return;
    }

    // List installations
    const installations = await UnityHub.getUnityInstallations();
    console.log("Installed versions:", Object.keys(installations));

    // Install WebGL support for specific version
    if (installations["2022.3.60f1"]) {
      await UnityHub.addModule("2022.3.60f1", [UnityModules.WebGLBuildSupport]);
      console.log("WebGL support added");
    }

    // Get recent projects
    const projects = await UnityHub.getProjects();
    console.log(
      "Recent projects:",
      projects.map((p) => p.name)
    );
  } catch (error) {
    console.error("Error in Unity workflow:", error);
  }
}
```

## Advanced Usage

### Custom Command Execution

```typescript
// List all editors with detailed output
const result = await UnityHub.execUnityHubCommand(["editors", "-a"], {
  reject: true, // Throw error on failure
  timeout: 30000, // 30 second timeout
  env: { UNITY_HUB_VERBOSE: "1" }, // Custom environment variables
});

// Process output
const editorList = result.stdout.split("\n").filter((line) => line.includes("Unity Version"));
```
