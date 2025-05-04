import { EventEmitter } from "events";
import { InstallerEventType, InstallerEvent, InstallerStatus } from "../types/unity.ts";
import { UnityHubEventParser } from "./hubEventParser.ts";

export interface InstallerEmitter extends EventEmitter {
  on(event: InstallerEventType.Progress, listener: (info: InstallerEvent[]) => void): this;
  on(event: InstallerEventType.Error, listener: (error: Error) => void): this;
  on(event: InstallerEventType.Completed, listener: (info: InstallerEvent[]) => void): this;
  on(event: InstallerEventType.Cancelled, listener: (info: InstallerEvent[]) => void): this;
  emit(event: InstallerEventType.Progress, info: InstallerEvent[]): boolean;
  emit(event: InstallerEventType.Error, info: InstallerEvent[]): boolean;
  emit(event: InstallerEventType.Completed, info: InstallerEvent[]): boolean;
  emit(event: InstallerEventType.Cancelled, info: InstallerEvent[]): boolean;

  readonly completed: Promise<InstallerEvent[]>;
}

export class UnityHubInstallerEvent extends EventEmitter implements InstallerEmitter {
  #moduleTracker: Map<string, InstallerStatus> = new Map();

  constructor() {
    super();
  }

  completed: Promise<InstallerEvent[]> = new Promise((resolve, reject) => {
    this.on(InstallerEventType.Completed, (events) => resolve(events));
    this.on(InstallerEventType.Error, (error) => reject(error));
    this.on(InstallerEventType.Cancelled, (events) => reject(new Error("Cancelled")));
  });

  /**
   * Parses the raw event string and emits the appropriate event.
   * @param raw - The raw event string from Unity Hub.
   * @returns {void}
   */
  Progress(raw: string): void {
    const events = UnityHubEventParser.parseUnityHubEvent(raw);
    if (events.length === 0) return;

    this.#Error(events);

    const progressEvents = events.filter((e) => e.status !== InstallerStatus.Error);

    if (progressEvents.length === 0) return;
    this.emit(InstallerEventType.Progress, progressEvents);
    this.#updateModuleTracker(events);
    this.#Complete(progressEvents);
  }

  #Error(events: InstallerEvent[]) {
    const errorEvents = events.filter((e) => e.status === InstallerStatus.Error);

    if (errorEvents.length === 0) return;
    this.emit(InstallerEventType.Error, errorEvents);
  }

  #Complete(events: InstallerEvent[]) {
    const installed = events.filter((e) => e.status === InstallerStatus.Installed);
    if (installed.length > 0 && installed.length === events.length) {
      this.emit(InstallerEventType.Completed, installed);
    }
  }

  /**
   * Emits a cancelled event.
   * @returns {void}
   */
  Cancel(): void {
    //Cancel operation
    this.#moduleTracker.clear();
    this.#Cancelled([]);
  }

  #Cancelled(event: InstallerEvent[]) {
    this.emit(InstallerEventType.Cancelled, event);
  }

  #updateModuleTracker(events: InstallerEvent[]) {
    for (const event of events) {
      this.#moduleTracker.set(event.module, event.status);
    }
  }
}
