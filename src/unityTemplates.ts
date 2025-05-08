import path from "path";
import fs from "fs-extra";
import { UnityConfig, PlatformConfig } from "./configs/unityConfig.ts";

interface ProjectTemplates {
  templateName: string;
  templatePath: string;
}

/**
 * UnityTemplates class provides methods to access Unity templates
 *
 */
class UnityTemplates {
  /**
   * Platform-specific configuration for Unity Hub
   * @internal
   */
  private static unityConfig: PlatformConfig = UnityConfig.getPlatformConfig();

  /**
   * Get the path to the Unity project templates
   * @returns The path to the Unity project templates
   */
  private static getProjectTemplatesPath(): string {
    return this.unityConfig.templates.projectTemplates;
  }

  /**
   * Get the path to the Unity project templates for a specific version
   * @param version - The Unity version
   * @returns The path to the Unity project templates for the specified version
   */
  private static getProjectTemplatesPathForVersion(version: string): string {
    return path.join(this.unityConfig.editor.base, version, this.getProjectTemplatesPath());
  }

  /**
   * Get the path to the Unity project templates for a specific version and template name
   * @param version - The Unity version
   * @param templateName - The name of the template
   * @returns The path to the Unity project templates for the specified version and template name
   */
  public static getProjectTemplates(version: string): ProjectTemplates[] {
    const templatePath = this.getProjectTemplatesPathForVersion(version);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template path does not exist: ${templatePath}`);
    }

    const templates = fs.readdirSync(templatePath).filter((file) => path.extname(file) === ".tgz");
    return templates.map((template) => ({
      templateName: path.basename(template, ".tgz"),
      templatePath: path.join(templatePath, template),
    }));
  }
}

export default UnityTemplates;
