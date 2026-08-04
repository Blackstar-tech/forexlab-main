import { createServer, IncomingMessage, ServerResponse } from "http";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

type User = {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

type Session = {
  token: string;
  userId: string;
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

type Db = {
  users: User[];
  sessions: Session[];
  trades: Trade[];
};

type AuthedRequest = {
  db: Db;
  user: User;
  token: string;
};

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "..", "public");
const dataDir = path.join(__dirname, "..", ".data");
const dbFile = path.join(dataDir, "db.json");
const uploadsDir = path.join(dataDir, "uploads");
const sessionCookie = "fj_session";
// 10MB to accommodate base64-encoded screenshot uploads alongside normal JSON bodies.
const maxBodyBytes = 10 * 1024 * 1024;
const maxUploadBytes = 8 * 1024 * 1024;

function emptyDb(): Db {
  return { users: [], sessions: [], trades: [] };
}

async function readDb(): Promise<Db> {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    const raw = await fs.readFile(dbFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      trades: Array.isArray(parsed.trades) ? parsed.trades : []
    };
  } catch {
    const db = emptyDb();
    await writeDb(db);
    return db;
  }
}

async function writeDb(db: Db): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dbFile, JSON.stringify(db, null, 2));
}

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
    const chunks: Uint8Array[] = [];
    let size = 0;

    req.on("data", (chunk) => {
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

  const db = await readDb();
  const session = db.sessions.find((item) => item.token === token);
  if (!session) return null;

  const user = db.users.find((item) => item.id === session.userId);
  if (!user) return null;

  return { db, user, token };
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

  const db = await readDb();
  if (db.users.some((user) => user.email === email)) {
    sendError(res, 409, "That email is already registered.");
    return;
  }

  const passwordData = createPasswordHash(password);
  const user: User = {
    id: makeId("usr"),
    name,
    email,
    salt: passwordData.salt,
    passwordHash: passwordData.passwordHash,
    createdAt: new Date().toISOString()
  };
  const session: Session = {
    token: crypto.randomBytes(32).toString("hex"),
    userId: user.id,
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  db.sessions.push(session);
  await writeDb(db);

  setSessionCookie(res, session.token);
  sendJson(res, 201, { user: publicUser(user) });
}

async function handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown>;
  const email = toText(body.email).toLowerCase();
  const password = toText(body.password);
  const db = await readDb();
  const user = db.users.find((item) => item.email === email);

  if (!user || !verifyPassword(password, user)) {
    sendError(res, 401, "Incorrect email or password.");
    return;
  }

  const session: Session = {
    token: crypto.randomBytes(32).toString("hex"),
    userId: user.id,
    createdAt: new Date().toISOString()
  };

  db.sessions.push(session);
  await writeDb(db);

  setSessionCookie(res, session.token);
  sendJson(res, 200, { user: publicUser(user) });
}

async function handleLogout(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const cookies = parseCookies(req);
  const token = cookies[sessionCookie];

  if (token) {
    const db = await readDb();
    db.sessions = db.sessions.filter((session) => session.token !== token);
    await writeDb(db);
  }

  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}

async function handleCreateTrade(req: IncomingMessage, res: ServerResponse, auth: AuthedRequest): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown>;
  const direction = body.direction === "sell" ? "sell" : "buy";
  const result = body.result === "loss" ? "loss" : body.result === "breakeven" ? "breakeven" : "win";

  const trade: Trade = {
    id: makeId("trd"),
    userId: auth.user.id,
    date: toText(body.date),
    time: toText(body.time),
    pair: toText(body.pair),
    session: toText(body.session),
    direction,
    result,
    setup: toText(body.setup),
    entryPrice: toNumber(body.entryPrice),
    stopLoss: toNumber(body.stopLoss),
    takeProfit: toNumber(body.takeProfit),
    lotSize: toNumber(body.lotSize),
    riskPercent: toNumber(body.riskPercent),
    plannedRr: toNumber(body.plannedRr),
    rrAchieved: toText(body.rrAchieved),
    pips: toNumber(body.pips),
    pnl: toNumber(body.pnl) || 0,
    emotion: toText(body.emotion),
    sleepQuality: toText(body.sleepQuality),
    confidence: toText(body.confidence),
    rating: Math.max(1, Math.min(5, toNumber(body.rating) || 3)),
    preTradeNotes: toText(body.preTradeNotes),
    notes: toText(body.notes),
    screenshots: toScreenshots(body.screenshots),
    createdAt: new Date().toISOString()
  };

  if (!trade.date || !trade.pair || !trade.setup) {
    sendError(res, 400, "Date, pair, and setup are required.");
    return;
  }

  auth.db.trades.push(trade);
  await writeDb(auth.db);

  sendJson(res, 201, { trade });
}

async function handleTrades(req: IncomingMessage, res: ServerResponse, auth: AuthedRequest): Promise<void> {
  const trades = auth.db.trades
    .filter((trade) => trade.userId === auth.user.id)
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  sendJson(res, 200, { trades });
}

async function handleDeleteTrade(res: ServerResponse, auth: AuthedRequest, id: string): Promise<void> {
  const target = auth.db.trades.find((trade) => trade.id === id && trade.userId === auth.user.id);

  if (!target) {
    sendError(res, 404, "Trade not found.");
    return;
  }

  auth.db.trades = auth.db.trades.filter((trade) => trade.id !== id);
  await writeDb(auth.db);

  await Promise.all(
    Object.values(target.screenshots)
      .filter((url): url is string => Boolean(url))
      .map((url) => removeUploadedFile(url).catch(() => undefined))
  );

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

async function removeUploadedFile(url: string): Promise<void> {
  const filename = url.replace("/api/uploads/", "");
  if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) return;
  await fs.unlink(path.join(uploadsDir, filename));
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

  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${makeId("shot")}.${ext}`;
  await fs.writeFile(path.join(uploadsDir, filename), buffer);

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
  const file = await fs.readFile(filePath);
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
    const info = await fs.stat(target);
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

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (requestUrl.pathname.startsWith("/api/")) {
      await handleApi(req, res, requestUrl.pathname);
      return;
    }

    await serveStatic(res, requestUrl.pathname);
  } catch (error) {
    console.error(error);
    sendError(res, 500, error instanceof Error ? error.message : "Server error.");
  }
});

server.listen(port, () => {
  console.log(`Trade journal running at http://localhost:${port}`);
});