import { InstallerEvent, InstallerStatus } from "../types/unity.ts";

export class UnityHubEventParser {
  static parseUnityHubEvent(event: string): InstallerEvent[] {
    const events: InstallerEvent[] = [];
    const lines = event.split("\n");

    const re = /^\[(?<module>[^\]]+)\]\s+(?<status>.+?)(?:(?:\s+(?<progress>\d+(?:\.\d+)?))%)?\.*$/;

    for (const line of lines) {
      const match = line.match(re);
      if (match && match.groups) {
        const { module, status, progress } = match.groups;
        events.push({
          module: module.trim(),
          status: status.replace(/\.\.\.$/, "").trim() as InstallerStatus,
          progress: progress ? parseFloat(progress) : 0,
        });
      }
    }

    return events;
  }
}
