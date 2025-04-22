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
