import { createServer, IncomingMessage, ServerResponse } from "http";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

dotenv.config();

const port = Number(process.env.PORT || 3000);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Forex Lab";
const APP_URL = process.env.APP_URL || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY.");
}

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.warn("Missing GMAIL_USER or GMAIL_APP_PASSWORD. Signup emails will be skipped.");
}

let supabase: SupabaseClient | null = null;
const mailTransporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD
        }
      })
    : null;

function resolveProjectPath(dirName: string): string {
  const candidates = [
    path.resolve(process.cwd(), dirName),
    path.resolve(__dirname, "..", dirName),
    path.resolve(__dirname, "..", "..", dirName)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Backend configuration is missing Supabase credentials.");
  }

  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  return supabase;
}

const publicDir = resolveProjectPath("public");
const dataDir = process.env.VERCEL ? path.join(os.tmpdir(), "forexlab") : resolveProjectPath(".data");
const uploadsDir = path.join(dataDir, "uploads");
const sessionCookie = "fj_session";

const maxBodyBytes = 10 * 1024 * 1024;
const maxUploadBytes = 8 * 1024 * 1024;

type User = {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

type TradeScreenshots = {
  before: string | null;
  after: string | null;
  analysis: string | null;
};

type Trade = {
  id: string;
  userId: string;
  date: string;
  time: string;
  pair: string;
  session: string;
  direction: "buy" | "sell";
  result: "win" | "loss" | "breakeven";
  setup: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  lotSize: number | null;
  riskPercent: number | null;
  plannedRr: number | null;
  rrAchieved: string;
  pips: number | null;
  pnl: number;
  emotion: string;
  sleepQuality: string;
  confidence: string;
  rating: number;
  preTradeNotes: string;
  notes: string;
  screenshots: TradeScreenshots;
  createdAt: string;
};

type AuthedRequest = {
  user: User;
  token: string;
};

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}

function createPasswordHash(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return { salt, passwordHash };
}

function verifyPassword(password: string, user: User): boolean {
  const candidate = createPasswordHash(password, user.salt).passwordHash;
  const left = Buffer.from(candidate, "hex");
  const right = Buffer.from(user.passwordHash, "hex");

  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function welcomeEmailHtml(name: string): string {
  const safeName = titleCase(name.replace(/[<>&]/g, ""));
  const appUrl = APP_URL || "#";

  return `
    <div style="background: #f4f6f8; padding: 32px 16px; font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e9ed;">
        <tr>
          <td style="padding: 28px 32px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 40px; height: 40px; background: #2dd4bf; border-radius: 8px; text-align: center; vertical-align: middle; font-family: Georgia, serif; font-weight: 700; font-size: 15px; color: #04100f;">FL</td>
                <td style="padding-left: 10px; font-size: 13px; color: #7c8791; font-weight: 600; letter-spacing: 0.02em;">FOREX LAB &middot; JOURNAL</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 32px 0;">
            <h1 style="margin: 0 0 12px; font-size: 22px; line-height: 1.3; color: #0f1216;">Welcome, ${safeName}.</h1>
            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.65; color: #4a535c;">
              Your trading journal is ready. Log setups, track the psychology behind each trade, and review your P&amp;L whenever you're ready to get started.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 32px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius: 8px; background: #2dd4bf;">
                  <a href="${appUrl}" style="display: inline-block; padding: 12px 22px; font-size: 14px; font-weight: 700; color: #04100f; text-decoration: none;">Open your journal &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #eef1f4;">
            <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #9aa3ab;">
              You're receiving this because an account was just created with this email address at Forex Lab. If this wasn't you, you can ignore this message.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function welcomeEmailText(name: string): string {
  const safeName = titleCase(name.replace(/[<>&]/g, ""));
  const appUrl = APP_URL || "your dashboard";

  return `Welcome, ${safeName}.

Your trading journal is ready. Log setups, track the psychology behind each trade, and review your P&L whenever you're ready to get started.

Open your journal: ${appUrl}

—
You're receiving this because an account was just created with this email address at Forex Lab. If this wasn't you, you can ignore this message.`;
}

// Fire-and-forget welcome email. Failures are logged but never block or fail the signup request itself —
// a missing/expired email provider key or a transient send error shouldn't prevent someone from signing up.
// NOTE: this only sends a welcome email today. To add email *verification* later, generate a token here,
// store it (e.g. a `verification_token` + `email_verified` column on `users`), include a confirmation link
// in this email, add a `GET /api/verify?token=...` route to mark the user verified, and gate login/features
// on `email_verified` once you're ready to enforce it.
async function sendWelcomeEmail(user: { name: string; email: string }): Promise<void> {
  if (!mailTransporter) return;

  try {
    await mailTransporter.sendMail({
      from: `"${MAIL_FROM_NAME}" <${GMAIL_USER}>`,
      to: user.email,
      subject: "Welcome to Forex Lab",
      text: welcomeEmailText(user.name),
      html: welcomeEmailHtml(user.name)
    });
  } catch (error) {
    // Never let a slow/failed email provider break signup — log it and move on.
    console.error("Welcome email failed to send:", error);
  }
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message });
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  const raw = Array.isArray(header) ? header.join(";") : header || "";

  return raw.split(";").reduce<Record<string, string>>((cookies, item) => {
    const [key, ...value] = item.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(value.join("="));
    return cookies;
  }, {});
}

function setSessionCookie(res: ServerResponse, token: string): void {
  res.setHeader(
    "Set-Cookie",
    `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`
  );
}

function clearSessionCookie(res: ServerResponse): void {
  res.setHeader("Set-Cookie", `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(new Error("Request body is too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toScreenshots(value: unknown): TradeScreenshots {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    before: toText(input.before) || null,
    after: toText(input.after) || null,
    analysis: toText(input.analysis) || null
  };
}

async function requireAuth(req: IncomingMessage): Promise<AuthedRequest | null> {
  const cookies = parseCookies(req);
  const token = cookies[sessionCookie];
  if (!token) return null;

  const { data: session } = await getSupabase()
    .from("sessions")
    .select("*, users(*)")
    .eq("token", token)
    .single();

  if (!session || !session.users) return null;

  const user: User = {
    id: session.users.id,
    name: session.users.name,
    email: session.users.email,
    salt: session.users.salt,
    passwordHash: session.users.password_hash,
    createdAt: session.users.created_at
  };

  return { user, token };
}

async function handleSignup(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown>;
  const name = toText(body.name);
  const email = toText(body.email).toLowerCase();
  const password = toText(body.password);

  if (!name || !email || !password) {
    sendError(res, 400, "Name, email, and password are required.");
    return;
  }

  if (!email.includes("@")) {
    sendError(res, 400, "Enter a valid email address.");
    return;
  }

  if (password.length < 6) {
    sendError(res, 400, "Password must be at least 6 characters.");
    return;
  }

  const { data: existingUser } = await getSupabase().from("users").select("id").eq("email", email).single();
  if (existingUser) {
    sendError(res, 409, "That email is already registered.");
    return;
  }

  const passwordData = createPasswordHash(password);
  const userId = makeId("usr");
  const createdAt = new Date().toISOString();

  const { error: userError } = await getSupabase().from("users").insert([
    {
      id: userId,
      name,
      email,
      salt: passwordData.salt,
      password_hash: passwordData.passwordHash,
      created_at: createdAt
    }
  ]);

  if (userError) {
    console.error("Supabase user insert failed:", userError);
    sendError(res, 500, "Failed to create user profile.");
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const { error: sessionError } = await getSupabase().from("sessions").insert([
    {
      token,
      user_id: userId,
      created_at: createdAt
    }
  ]);

  if (sessionError) {
    console.error("Supabase session insert failed:", sessionError);
    sendError(res, 500, "Failed to create session.");
    return;
  }

  const user: User = { id: userId, name, email, salt: passwordData.salt, passwordHash: passwordData.passwordHash, createdAt };

  await sendWelcomeEmail({ name: user.name, email: user.email });

  setSessionCookie(res, token);
  sendJson(res, 201, { user: publicUser(user) });
}

async function handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown>;
  const email = toText(body.email).toLowerCase();
  const password = toText(body.password);

  const { data: rawUser } = await getSupabase().from("users").select("*").eq("email", email).single();

  if (!rawUser) {
    sendError(res, 401, "Incorrect email or password.");
    return;
  }

  const user: User = {
    id: rawUser.id,
    name: rawUser.name,
    email: rawUser.email,
    salt: rawUser.salt,
    passwordHash: rawUser.password_hash,
    createdAt: rawUser.created_at
  };

  if (!verifyPassword(password, user)) {
    sendError(res, 401, "Incorrect email or password.");
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  await getSupabase().from("sessions").insert([
    {
      token,
      user_id: user.id,
      created_at: new Date().toISOString()
    }
  ]);

  setSessionCookie(res, token);
  sendJson(res, 200, { user: publicUser(user) });
}

async function handleLogout(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const cookies = parseCookies(req);
  const token = cookies[sessionCookie];

  if (token) {
    await getSupabase().from("sessions").delete().eq("token", token);
  }

  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}

async function handleCreateTrade(req: IncomingMessage, res: ServerResponse, auth: AuthedRequest): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown>;
  const direction = body.direction === "sell" ? "sell" : "buy";
  const result = body.result === "loss" ? "loss" : body.result === "breakeven" ? "breakeven" : "win";
  const screenshots = toScreenshots(body.screenshots);

  const tradeData = {
    id: makeId("trd"),
    user_id: auth.user.id,
    date: toText(body.date),
    time: toText(body.time),
    pair: toText(body.pair),
    session: toText(body.session),
    direction,
    result,
    setup: toText(body.setup),
    entry_price: toNumber(body.entryPrice),
    stop_loss: toNumber(body.stopLoss),
    take_profit: toNumber(body.takeProfit),
    risk_percent: toNumber(body.riskPercent),
    planned_rr: toNumber(body.plannedRr),
    pnl: toNumber(body.pnl) || 0,
    mood: toText(body.emotion),
    rating: Math.max(1, Math.min(5, toNumber(body.rating) || 3)),
    notes: toText(body.notes),
    created_at: new Date().toISOString()
  };

  if (!tradeData.date || !tradeData.pair || !tradeData.setup) {
    sendError(res, 400, "Date, pair, and setup are required.");
    return;
  }

  const { data, error } = await getSupabase().from("trades").insert([tradeData]).select().single();

  if (error) {
    console.error(error);
    sendError(res, 500, "Failed to save trade.");
    return;
  }

  const trade: Trade = {
    id: data.id,
    userId: data.user_id,
    date: data.date,
    time: data.time || "",
    pair: data.pair,
    session: data.session || "",
    direction: data.direction,
    result: data.result,
    setup: data.setup,
    entryPrice: data.entry_price,
    stopLoss: data.stop_loss,
    takeProfit: data.take_profit,
    lotSize: toNumber(body.lotSize),
    riskPercent: data.risk_percent,
    plannedRr: data.planned_rr,
    rrAchieved: toText(body.rrAchieved),
    pips: toNumber(body.pips),
    pnl: data.pnl,
    emotion: data.mood || "",
    sleepQuality: toText(body.sleepQuality),
    confidence: toText(body.confidence),
    rating: data.rating,
    preTradeNotes: toText(body.preTradeNotes),
    notes: data.notes || "",
    screenshots,
    createdAt: data.created_at
  };

  sendJson(res, 201, { trade });
}

async function handleTrades(req: IncomingMessage, res: ServerResponse, auth: AuthedRequest): Promise<void> {
  const { data: dbTrades, error } = await getSupabase()
    .from("trades")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    sendError(res, 500, "Failed to fetch trades.");
    return;
  }

  const trades: Trade[] = (dbTrades || []).map((t) => ({
    id: t.id,
    userId: t.user_id,
    date: t.date,
    time: t.time || "",
    pair: t.pair,
    session: t.session || "",
    direction: t.direction,
    result: t.result,
    setup: t.setup,
    entryPrice: t.entry_price,
    stopLoss: t.stop_loss,
    takeProfit: t.take_profit,
    lotSize: null,
    riskPercent: t.risk_percent,
    plannedRr: t.planned_rr,
    rrAchieved: "",
    pips: null,
    pnl: t.pnl || 0,
    emotion: t.mood || "",
    sleepQuality: "",
    confidence: "",
    rating: t.rating || 3,
    preTradeNotes: "",
    notes: t.notes || "",
    screenshots: { before: null, after: null, analysis: null },
    createdAt: t.created_at
  }));

  sendJson(res, 200, { trades });
}

async function handleDeleteTrade(res: ServerResponse, auth: AuthedRequest, id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("trades")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    sendError(res, 500, "Failed to delete trade.");
    return;
  }

  sendJson(res, 200, { ok: true });
}

function extensionForMime(mime: string): string | null {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp"
  };
  return map[mime] || null;
}

async function handleUploadCreate(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown>;
  const dataUrl = toText(body.dataUrl);
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);

  if (!match) {
    sendError(res, 400, "Upload a PNG, JPG, or WEBP image.");
    return;
  }

  const mime = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const ext = extensionForMime(mime);
  if (!ext) {
    sendError(res, 400, "Unsupported image type.");
    return;
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > maxUploadBytes) {
    sendError(res, 413, "Image is too large (max 8MB).");
    return;
  }

  await fs.promises.mkdir(uploadsDir, { recursive: true });
  const filename = `${makeId("shot")}.${ext}`;
  await fs.promises.writeFile(path.join(uploadsDir, filename), buffer);

  sendJson(res, 201, { url: `/api/uploads/${filename}` });
}

async function handleUploadServe(res: ServerResponse, filename: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
    sendError(res, 400, "Invalid file name.");
    return;
  }

  try {
    await serveFile(res, path.join(uploadsDir, filename));
  } catch {
    sendError(res, 404, "Image not found.");
  }
}

async function handleApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  const method = req.method || "GET";

  if (pathname === "/api/health" && method === "GET") {
    sendJson(res, 200, {
      ok: true,
      supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY),
      emailConfigured: Boolean(GMAIL_USER && GMAIL_APP_PASSWORD)
    });
    return;
  }

  if (pathname === "/api/signup" && method === "POST") {
    await handleSignup(req, res);
    return;
  }

  if (pathname === "/api/login" && method === "POST") {
    await handleLogin(req, res);
    return;
  }

  if (pathname === "/api/logout" && method === "POST") {
    await handleLogout(req, res);
    return;
  }

  const auth = await requireAuth(req);
  if (!auth) {
    sendError(res, 401, "You need to sign in first.");
    return;
  }

  if (pathname === "/api/me" && method === "GET") {
    sendJson(res, 200, { user: publicUser(auth.user) });
    return;
  }

  if (pathname === "/api/trades" && method === "GET") {
    await handleTrades(req, res, auth);
    return;
  }

  if (pathname === "/api/trades" && method === "POST") {
    await handleCreateTrade(req, res, auth);
    return;
  }

  if (pathname.startsWith("/api/trades/") && method === "DELETE") {
    await handleDeleteTrade(res, auth, pathname.replace("/api/trades/", ""));
    return;
  }

  if (pathname === "/api/uploads" && method === "POST") {
    await handleUploadCreate(req, res);
    return;
  }

  if (pathname.startsWith("/api/uploads/") && method === "GET") {
    await handleUploadServe(res, pathname.replace("/api/uploads/", ""));
    return;
  }

  sendError(res, 404, "Route not found.");
}

function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml"
  };

  return types[ext] || "application/octet-stream";
}

async function serveFile(res: ServerResponse, filePath: string): Promise<void> {
  const file = await fs.promises.readFile(filePath);
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeType(filePath));
  res.end(file);
}

function isInsidePath(target: string, root: string): boolean {
  return target === root || target.startsWith(`${root}\\`) || target.startsWith(`${root}/`);
}

async function serveStatic(res: ServerResponse, pathname: string): Promise<void> {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const target = path.resolve(publicDir, path.normalize(cleanPath).replace(/^[/\\]+/, ""));
  const allowedPublic = path.resolve(publicDir);

  if (!isInsidePath(target, allowedPublic)) {
    sendError(res, 403, "Forbidden.");
    return;
  }

  try {
    const info = await fs.promises.stat(target);
    if (!info.isFile()) throw new Error("Not a file");
    await serveFile(res, target);
  } catch {
    const ext = path.extname(target);
    if (!ext) {
      await serveFile(res, path.join(publicDir, "index.html"));
    } else {
      sendError(res, 404, `Not found: ${pathname}`);
    }
  }
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const rewrittenApiPath = requestUrl.searchParams.get("path");
    const pathname =
      requestUrl.pathname === "/api/index" && rewrittenApiPath
        ? `/api/${rewrittenApiPath.replace(/^\/+/, "")}`
        : requestUrl.pathname;

    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }

    await serveStatic(res, pathname);
  } catch (error) {
    console.error(error);
    sendError(res, 500, error instanceof Error ? error.message : "Server error.");
  }
}

// Only start a real listening server when running locally (e.g. `ts-node src/server.ts`
// or `node dist/src/server.js`). On Vercel this file is imported by api/index.ts instead,
// so this block should never run there.
if (require.main === module) {
  createServer((req, res) => {
    handleRequest(req, res);
  }).listen(port, () => {
    console.log(`Trade journal running at http://localhost:${port}`);
  });
}

// Safety net: if anything on Vercel (e.g. a "main" field in package.json, or an old
// build config) ever loads this file directly as a function entry instead of going
// through api/index.ts, it still needs a valid default export — a function with the
// (req, res) signature Vercel's Node runtime expects. handleRequest already matches
// that shape exactly, so we just point default at it.
export default handleRequest;