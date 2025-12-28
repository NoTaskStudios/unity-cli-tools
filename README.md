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
- `UnityEditor` - For interacting with Unity Editor

### Error Handling with Result Pattern

All operations return a `Result<T, E>` type instead of throwing exceptions. This provides:

- **Type-safe error handling** - Errors are explicit in the return type
- **Rich error context** - Each error includes error codes, messages, and contextual data
- **Composable operations** - Chain operations with `map`, `andThen`, etc.
- **No unexpected exceptions** - All errors are handled explicitly

```typescript
import { UnityHub, isOk, isErr } from "@notask/unity-cli-tools";

const result = await UnityHub.getUnityInstallations();

if (isOk(result)) {
  // Type-safe access to the value
  const installations = result.value;
  console.log("Installed versions:", Object.keys(installations));
} else {
  // Type-safe access to the error
  console.error(`Error [${result.error.code}]:`, result.error.message);
  console.error("Context:", result.error.context);
}
```

## UnityHub API Reference

### Checking Availability

```typescript
import { UnityHub } from "@notask/unity-cli-tools";

// Check if Unity Hub is available
const isAvailable = await UnityHub.isUnityHubAvailable();
```

### Finding Unity Installations

```typescript
import { UnityHub, isOk } from "@notask/unity-cli-tools";

// Get all installed Unity versions
const result = await UnityHub.getUnityInstallations();

if (isOk(result)) {
  const installations = result.value;
  // Returns: { '2022.3.60f1': 'C:/Program Files/Unity/Hub/Editor/2022.3.60f1', ... }
  console.log("Installed versions:", Object.keys(installations));
} else {
  console.error("Failed to get installations:", result.error.message);
}
```

### Managing Unity Versions

```typescript
import { UnityHub, UnityModules, isOk } from "@notask/unity-cli-tools";

// Install a new Unity version
const result = await UnityHub.addEditor("2022.3.60f1");

if (isOk(result)) {
  const installer = result.value;

  // Wait for installation to complete
  await installer.completed;
  console.log("Installation completed!");
} else {
  console.error("Failed to start installation:", result.error.message);
}

// Install with specific modules
const resultWithModules = await UnityHub.addEditor(
  "2022.3.60f1",
  [UnityModules.AndroidBuildSupport, UnityModules.WebGLBuildSupport]
);

// Add modules to existing installation
const moduleResult = await UnityHub.addModule(
  "2022.3.60f1",
  [UnityModules.IOSBuildSupport]
);

if (isOk(moduleResult)) {
  console.log("Module installation started");
}
```

### Installation Events

```typescript
import { UnityHub, UnityModules, InstallerEventType, isOk } from "@notask/unity-cli-tools";

// Install with event tracking
const result = await UnityHub.addEditor("2022.3.60f1");

if (!isOk(result)) {
  console.error("Failed to start installation:", result.error);
  return;
}

const installer = result.value;

// Listen to progress events
installer.on(InstallerEventType.Progress, (events) => {
  console.log("Progress:", events.map(e => `${e.module}: ${e.status} ${e.progress || 0}%`));
});

installer.on(InstallerEventType.Error, (errorEvents) => {
  console.error("Installation error:", errorEvents);
});

installer.on(InstallerEventType.Completed, (events) => {
  console.log("Installation completed!");
});

// Or use the promise
try {
  const completedEvents = await installer.completed;
  console.log("Installation finished:", completedEvents);
} catch (error) {
  console.error("Installation failed:", error);
}

// Cancel installation if needed
installer.Cancel();
```

### Projects Management

```typescript
import { UnityHub, isOk } from "@notask/unity-cli-tools";

// Get projects from Unity Hub
const result = await UnityHub.getProjects();

if (isOk(result)) {
  const projects = result.value;
  // Returns: [{ name: 'ProjectName', path: '/path/to/project', version: '2022.3.60f1' }, ...]
  console.log("Projects:", projects);
}

// Get default projects directory
const dirResult = await UnityHub.getDefaultProjectsDirectory();

if (isOk(dirResult)) {
  const defaultDir = dirResult.value; // string | null
  console.log("Default directory:", defaultDir);
}
```

### Custom Commands

```typescript
import { UnityHub, isOk } from "@notask/unity-cli-tools";

// Execute any Hub command directly
const result = await UnityHub.execUnityHubCommand(["editors", "-r"]);

if (isOk(result)) {
  console.log(result.value.stdout);
  console.log("Exit code:", result.value.exitCode);
} else {
  console.error("Command failed:", result.error.stderr);
}
```

## UnityEditor API Reference

UnityEditor provides an interface for automating tasks directly in the Unity Editor:

### Installation and Availability

```typescript
import { UnityEditor } from "@notask/unity-cli-tools";

// Get the executable path and verify installation
const unityPath = UnityEditor.getUnityExecutablePath("2022.3.15f1");
const isInstalled = await UnityEditor.isUnityVersionInstalled("2022.3.15f1");
console.log(`Installed: ${isInstalled}`, unityPath);
```

### Executing Raw Editor Commands

```typescript
import { UnityEditor, isOk } from "@notask/unity-cli-tools";

const editorInfo = { version: "2022.3.15f1", path: unityPath };
const result = await UnityEditor.execUnityEditorCommand(
  editorInfo,
  ["-batchmode", "-quit", "-projectPath", "/path/to/project"]
);

if (isOk(result)) {
  console.log("Command output:", result.value.stdout);
  console.log("Exit code:", result.value.exitCode);
} else {
  console.error("Command failed:", result.error.message);
  console.error("Error output:", result.error.stderr);
}
```

### Creating and Opening Projects

```typescript
import { UnityEditor, ProjectInfo, isOk } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectName: "MyAwesomeGame",
  projectPath: "/path/to/new/project",
  editorVersion: "2022.3.15f1"
};

// Create project
const createResult = await UnityEditor.createProject(projectInfo);

if (isOk(createResult)) {
  console.log("Project created successfully!");

  // Open project
  const openResult = await UnityEditor.openProject(projectInfo, true, true);

  if (isOk(openResult)) {
    console.log("Project opened successfully!");
  }
} else {
  console.error("Failed to create project:", createResult.error.message);
}
```

### Running Tests

```typescript
import { UnityEditor, ProjectInfo, TestMode, isOk } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectName: "MyGame",
  projectPath: "/path/to/project",
  editorVersion: "2022.3.15f1"
};

const result = await UnityEditor.runTests(projectInfo, TestMode.EditMode);

if (isOk(result)) {
  console.log("All tests passed!");
  console.log("Test output:", result.value);
} else {
  console.error("Tests failed:", result.error.message);

  // UnityTestError includes the test output
  if (result.error.code === "UNITY_TEST_ERROR") {
    console.error("Test output:", result.error.testOutput);
  }
}
```

### License Management

```typescript
import { UnityEditor, ProjectInfo, isOk } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectName: "MyGame",
  projectPath: "/path/to/project",
  editorVersion: "2022.3.15f1"
};

// Activate license
const activateResult = await UnityEditor.activateLicense(
  projectInfo,
  "XXXX-XXXX-XXXX-XXXX-XXXX",
  "user@example.com",
  "password"
);

if (isOk(activateResult)) {
  console.log("License activated successfully!");

  // Do work...

  // Return license when done
  const returnResult = await UnityEditor.returnLicense(projectInfo);

  if (isOk(returnResult)) {
    console.log("License returned successfully!");
  }
} else {
  console.error("License activation failed:", activateResult.error.message);
}
```

### Importing and Exporting Packages

```typescript
import { UnityEditor, ProjectInfo, isOk } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectName: "MyGame",
  projectPath: "/path/to/project",
  editorVersion: "2022.3.15f1"
};

// Export package
const exportResult = await UnityEditor.exportPackage(
  projectInfo,
  ["Assets/UI", "Assets/Scripts"],
  "/path/to/output/MyPackage.unitypackage"
);

if (isOk(exportResult)) {
  console.log("Package exported successfully!");
}

// Import package
const importResult = await UnityEditor.importPackage(
  projectInfo,
  "/path/to/downloads/OtherPackage.unitypackage"
);

if (isOk(importResult)) {
  console.log("Package imported successfully!");
}
```

### Executing Custom Editor Methods

```typescript
import { UnityEditor, ProjectInfo, isOk } from "@notask/unity-cli-tools";

const projectInfo: ProjectInfo = {
  projectName: "MyGame",
  projectPath: "/path/to/project",
  editorVersion: "2022.3.15f1"
};

const result = await UnityEditor.executeMethod(
  projectInfo,
  "MyCompany.BuildTools.PerformBuild"
);

if (isOk(result)) {
  console.log("Method executed successfully!");
  console.log("Output:", result.value.stdout);
} else {
  console.error("Method execution failed:", result.error.message);
}
```

## Error Handling

### Error Types

The library provides specific error types for different failure scenarios:

```typescript
import {
  UnityHubNotFoundError,
  UnityEditorNotFoundError,
  UnityCommandError,
  UnityInstallationError,
  UnityProjectError,
  UnityLicenseError,
  UnityPackageError,
  UnityTestError,
  InvalidArgumentError,
} from "@notask/unity-cli-tools";
```

Each error includes:
- `code` - Error code for programmatic handling
- `message` - Human-readable error message
- `context` - Additional contextual information
- `stack` - Stack trace

### Error Handling Patterns

**Basic Pattern Matching:**
```typescript
const result = await UnityHub.getUnityInstallations();

if (result.success) {
  // Handle success
  const installations = result.value;
} else {
  // Handle error
  const error = result.error;
  console.error(`[${error.code}] ${error.message}`);
}
```

**Type Guards:**
```typescript
import { isOk, isErr } from "@notask/unity-cli-tools";

const result = await UnityHub.getUnityInstallations();

if (isOk(result)) {
  // TypeScript knows result.value exists
  const installations = result.value;
}

if (isErr(result)) {
  // TypeScript knows result.error exists
  const error = result.error;
}
```

**Specific Error Handling:**
```typescript
const result = await UnityHub.getUnityInstallations();

if (!result.success) {
  switch (result.error.code) {
    case "UNITY_HUB_NOT_FOUND":
      console.error("Please install Unity Hub");
      break;
    case "UNITY_INSTALLATION_ERROR":
      console.error("No Unity versions found");
      break;
    default:
      console.error("Unexpected error:", result.error.message);
  }
}
```

**Chaining Operations:**
```typescript
import { map, andThen } from "@notask/unity-cli-tools";

const result = await UnityHub.getUnityInstallations();

// Transform the result
const versions = map(result, (installations) => Object.keys(installations));

// Chain operations
const firstVersion = andThen(result, async (installations) => {
  const versions = Object.keys(installations);
  if (versions.length === 0) {
    return err(new UnityInstallationError("No installations found"));
  }
  return ok(versions[0]);
});
```

**Unwrapping (Use with Caution):**
```typescript
import { unwrap, unwrapOr } from "@notask/unity-cli-tools";

// Throws if result is an error
const installations = unwrap(await UnityHub.getUnityInstallations());

// Returns default value if result is an error
const installations = unwrapOr(await UnityHub.getUnityInstallations(), {});
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

### Error Codes

| Code                        | Description                           |
| --------------------------- | ------------------------------------- |
| `UNITY_HUB_NOT_FOUND`       | Unity Hub executable not found        |
| `UNITY_EDITOR_NOT_FOUND`    | Unity Editor version not found        |
| `UNITY_COMMAND_ERROR`       | Command execution failed              |
| `UNITY_INSTALLATION_ERROR`  | Installation operation failed         |
| `UNITY_PROJECT_ERROR`       | Project operation failed              |
| `UNITY_LICENSE_ERROR`       | License operation failed              |
| `UNITY_PACKAGE_ERROR`       | Package operation failed              |
| `UNITY_TEST_ERROR`          | Tests failed                          |
| `INVALID_ARGUMENT`          | Invalid argument provided             |

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
import { UnityHub, UnityModules, isOk } from "@notask/unity-cli-tools";

async function manageUnityInstallation() {
  // Check if hub is available
  const isAvailable = await UnityHub.isUnityHubAvailable();
  if (!isAvailable) {
    console.error("Unity Hub not found");
    return;
  }

  // List installations
  const installsResult = await UnityHub.getUnityInstallations();

  if (!isOk(installsResult)) {
    console.error("Failed to get installations:", installsResult.error.message);
    return;
  }

  const installations = installsResult.value;
  console.log("Installed versions:", Object.keys(installations));

  // Install WebGL support for specific version
  if (installations["2022.3.60f1"]) {
    const moduleResult = await UnityHub.addModule(
      "2022.3.60f1",
      [UnityModules.WebGLBuildSupport]
    );

    if (isOk(moduleResult)) {
      const installer = moduleResult.value;
      await installer.completed;
      console.log("WebGL support added");
    }
  }

  // Get recent projects
  const projectsResult = await UnityHub.getProjects();

  if (isOk(projectsResult)) {
    const projects = projectsResult.value;
    console.log("Recent projects:", projects.map((p) => p.name));
  }
}

manageUnityInstallation().catch(console.error);
```

### CI/CD Pipeline Example

```typescript
import { UnityEditor, ProjectInfo, TestMode, isOk } from "@notask/unity-cli-tools";

async function ciPipeline() {
  const projectInfo: ProjectInfo = {
    projectName: "MyGame",
    projectPath: process.cwd(),
    editorVersion: "2022.3.15f1"
  };

  // Activate license
  const licenseResult = await UnityEditor.activateLicense(
    projectInfo,
    process.env.UNITY_SERIAL!,
    process.env.UNITY_EMAIL!,
    process.env.UNITY_PASSWORD!
  );

  if (!isOk(licenseResult)) {
    console.error("License activation failed:", licenseResult.error.message);
    process.exit(1);
  }

  try {
    // Run tests
    const testResult = await UnityEditor.runTests(projectInfo, TestMode.EditMode);

    if (!isOk(testResult)) {
      console.error("Tests failed:", testResult.error.message);

      if (testResult.error.code === "UNITY_TEST_ERROR") {
        console.error("Test output:", testResult.error.testOutput);
      }

      process.exit(1);
    }

    console.log("All tests passed!");

    // Build project
    const buildResult = await UnityEditor.executeMethod(
      projectInfo,
      "BuildScript.PerformBuild"
    );

    if (!isOk(buildResult)) {
      console.error("Build failed:", buildResult.error.message);
      process.exit(1);
    }

    console.log("Build completed successfully!");

  } finally {
    // Always return license
    await UnityEditor.returnLicense(projectInfo);
  }
}

ciPipeline().catch(console.error);
```

## Advanced Usage

### Custom Command Execution

```typescript
import { UnityHub, isOk } from "@notask/unity-cli-tools";

// List all editors with detailed output
const result = await UnityHub.execUnityHubCommand(["editors", "-a"], {
  timeout: 30000, // 30 second timeout
  env: { UNITY_HUB_VERBOSE: "1" }, // Custom environment variables
});

if (isOk(result)) {
  // Process output
  const editorList = result.value.stdout
    .split("\n")
    .filter((line) => line.includes("Unity Version"));

  console.log("Editors:", editorList);
} else {
  console.error("Command failed:", result.error.message);
}
```

### Streaming Command Output

```typescript
import { UnityHub, isOk } from "@notask/unity-cli-tools";

const result = await UnityHub.execUnityHubCommand(["editors", "-i"], {
  onStdout: (line) => {
    console.log("STDOUT:", line);
  },
  onStderr: (line) => {
    console.error("STDERR:", line);
  }
});

if (isOk(result)) {
  console.log("Command completed");
}
```

## Migration Guide

### Migrating from Previous Versions

**Version 2.x introduces breaking changes with the Result pattern:**

**Before (v1.x):**
```typescript
try {
  const installations = await UnityHub.getUnityInstallations();
  console.log(installations);
} catch (error) {
  console.error(error);
}
```

**After (v2.x):**
```typescript
import { isOk } from "@notask/unity-cli-tools";

const result = await UnityHub.getUnityInstallations();

if (isOk(result)) {
  console.log(result.value);
} else {
  console.error(result.error.message);
}
```

**Method Return Type Changes:**

| Method | Old Return Type | New Return Type |
|--------|----------------|-----------------|
| `getUnityInstallations()` | `Promise<UnityInstallations>` (throws) | `Promise<Result<UnityInstallations, Error>>` |
| `runTests()` | `Promise<{success: boolean, output: string}>` | `Promise<Result<string, UnityTestError>>` |
| `activateLicense()` | `Promise<boolean>` | `Promise<Result<void, UnityLicenseError>>` |
| `createProject()` | `Promise<boolean>` | `Promise<Result<void, UnityProjectError>>` |

## TypeScript Support

This library is written in TypeScript and provides full type definitions:

```typescript
import {
  UnityHub,
  UnityEditor,
  ProjectInfo,
  UnityModules,
  TestMode,
  Result,
  UnityError,
  isOk,
  isErr,
} from "@notask/unity-cli-tools";

// All types are exported and fully typed
const projectInfo: ProjectInfo = {
  projectName: "MyGame",
  projectPath: "/path/to/project",
  editorVersion: "2022.3.15f1"
};
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details
