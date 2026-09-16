import Dexie, { type Table } from "dexie";
import type { Attempt } from "../lib/types";

export interface SettingRow {
  key: string;
  value: unknown;
}

export class AppDatabase extends Dexie {
  attempts!: Table<Attempt, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super("ifl-practice");
    this.version(1).stores({
      attempts: "id, paperId, startedAt, status, parentAttemptId",
      settings: "key",
    });
  }
}

export const db = new AppDatabase();
