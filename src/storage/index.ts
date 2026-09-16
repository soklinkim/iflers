import type { Attempt, PaperId } from "../lib/types";
import { db } from "./db";

/**
 * Everything else in the app talks to this interface, never to Dexie directly.
 * Swapping in a cloud-sync implementation later (README §11) means writing one
 * new module here, not touching every screen that persists an attempt.
 */
export interface AttemptStore {
  listAttempts(paperId: PaperId): Promise<Attempt[]>;
  getAttempt(id: string): Promise<Attempt | null>;
  saveAttempt(a: Attempt): Promise<void>;
  deleteAttempt(id: string): Promise<void>;
  exportAll(): Promise<string>;
  importAll(json: string): Promise<void>;
  clearAll(): Promise<void>;
}

interface ExportShape {
  version: 1;
  exportedAt: string;
  attempts: Attempt[];
}

class DexieAttemptStore implements AttemptStore {
  async listAttempts(paperId: PaperId): Promise<Attempt[]> {
    return db.attempts.where("paperId").equals(paperId).sortBy("startedAt");
  }

  async getAttempt(id: string): Promise<Attempt | null> {
    const a = await db.attempts.get(id);
    return a ?? null;
  }

  async saveAttempt(a: Attempt): Promise<void> {
    await db.attempts.put(a);
  }

  async deleteAttempt(id: string): Promise<void> {
    await db.attempts.delete(id);
  }

  async exportAll(): Promise<string> {
    const attempts = await db.attempts.toArray();
    const payload: ExportShape = {
      version: 1,
      exportedAt: new Date().toISOString(),
      attempts,
    };
    return JSON.stringify(payload, null, 2);
  }

  /** Merges by attempt id — importing an already-present attempt overwrites it with the imported copy, never duplicates. */
  async importAll(json: string): Promise<void> {
    const parsed = JSON.parse(json) as Partial<ExportShape>;
    if (!parsed || !Array.isArray(parsed.attempts)) {
      throw new Error("This file doesn't look like an IFL Practice export.");
    }
    await db.attempts.bulkPut(parsed.attempts);
  }

  async clearAll(): Promise<void> {
    await db.attempts.clear();
  }
}

export const attemptStore: AttemptStore = new DexieAttemptStore();
