import { EventEmitter } from "events";
import { InstallerEventType, InstallerEvent, InstallerStatus } from "../types/unity.ts";
import { UnityHubEventParser } from "./hubEventParser.ts";

export interface InstallerEmitter extends EventEmitter {
  on(event: InstallerEventType.Progress, listener: (info: InstallerEvent[]) => void): this;
  on(event: InstallerEventType.Error, listener: (error: Error, info: InstallerEvent[]) => void): this;
  on(event: InstallerEventType.Complete, listener: (info: InstallerEvent[]) => void): this;
  on(event: InstallerEventType.Cancelled, listener: (info: InstallerEvent[]) => void): this;
  emit(event: InstallerEventType.Progress, info: InstallerEvent[]): boolean;
  emit(event: InstallerEventType.Error, error: Error, info: InstallerEvent[]): boolean;
  emit(event: InstallerEventType.Complete, info: InstallerEvent[]): boolean;
  emit(event: InstallerEventType.Cancelled, info: InstallerEvent[]): boolean;

  readonly completed: Promise<InstallerEvent[]>;
}

export class UnityHubInstallerEvent extends EventEmitter implements InstallerEmitter {
  constructor() {
    super();
  }

  completed: Promise<InstallerEvent[]> = new Promise((resolve, reject) => {
    this.on(InstallerEventType.Complete, (events) => resolve(events));
    this.on(InstallerEventType.Error, (error, events) => reject(error));
    this.on(InstallerEventType.Cancelled, (events) => reject(new Error("Cancelled")));
  });

  Progress(raw: string) {
    const event = UnityHubEventParser.parseUnityHubEvent(raw);
    this.emit(InstallerEventType.Progress, event);
  }

  Error(raw: string, err: Error) {
    const events = UnityHubEventParser.parseUnityHubEvent(raw);
    this.emit(InstallerEventType.Error, err, events);
  }

  Complete(raw: string) {
    const events = UnityHubEventParser.parseUnityHubEvent(raw);
    const installed = events.filter((e) => e.status === InstallerStatus.Installed);
    if (installed.length > 0 && installed.length === events.length) {
      this.emit(InstallerEventType.Complete, installed);
    }
  }

  Cancelled(event: InstallerEvent[]) {
    this.emit(InstallerEventType.Cancelled, event);
  }
}
