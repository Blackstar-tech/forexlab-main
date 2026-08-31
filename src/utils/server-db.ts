import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { User, Trade, CaseStudy } from "./types";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
export const useLocalDataStore = !process.env.VERCEL && process.env.USE_SUPABASE !== "true";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

export function getDataDir(): string {
  const dir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getDbPath(): string {
  return path.join(getDataDir(), "db.json");
}

export type DbSchema = {
  users: Array<User & { salt: string; passwordHash: string; createdAt: string }>;
  sessions: Array<{ token: string; userId: string; createdAt: string }>;
  trades: Trade[];
  caseStudies: CaseStudy[];
  passwordResets: Array<{ token: string; userId: string; expiresAt: string; used: boolean }>;
};

export async function readLocalDb(): Promise<DbSchema> {
  const file = getDbPath();
  if (!fs.existsSync(file)) {
    const initial: DbSchema = { users: [], sessions: [], trades: [], caseStudies: [], passwordResets: [] };
    fs.writeFileSync(file, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { users: [], sessions: [], trades: [], caseStudies: [], passwordResets: [] };
  }
}

export async function writeLocalDb(db: DbSchema): Promise<void> {
  const file = getDbPath();
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

export function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 1000, 32, "sha256").toString("hex");
  return { salt: s, hash };
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}
