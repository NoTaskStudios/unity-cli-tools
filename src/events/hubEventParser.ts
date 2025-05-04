import { InstallerEvent, InstallerStatus } from "../types/unity.ts";

export class UnityHubEventParser {
  private static errorPatterns = [/Error:.*/];

  public static parseUnityHubEvent(event: string): InstallerEvent[] {
    const events: InstallerEvent[] = [];
    const lines = event.split("\n");

    for (const line of lines) {
      const errorLine = this.checkForErrors(line);
      if (errorLine) {
        events.push(errorLine);
        continue;
      }
    }

    const pattern = /^\[(?<module>[^\]]+)\]\s+(?<status>.+?)(?:(?:\s+(?<progress>\d+(?:\.\d+)?))%)?\.*$/;

    for (const line of lines) {
      const match = line.match(pattern);
      if (match && match.groups) {
        const { module, status, progress } = match.groups;
        events.push({
          module: module.trim(),
          status: status.replace(/\.\.\.$/, "").trim() as InstallerStatus,
          progress: progress ? parseFloat(progress) : status !== InstallerStatus.Downloading ? null : 0,
        });
      }
    }

    return events;
  }

  private static checkForErrors(line: string): InstallerEvent | null {
    for (const pattern of this.errorPatterns) {
      if (pattern.test(line)) {
        return {
          module: "UnityHub",
          status: InstallerStatus.Error,
          error: line.trim(),
        };
      }
    }
    return null;
  }
}
