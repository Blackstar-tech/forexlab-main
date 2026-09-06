import { describe, it, expect, beforeEach, vi } from "vitest";
import nodemailer from "nodemailer";
import { POST as forgotPost } from "./forgot/route";
import { GET as resetGet, POST as resetPost } from "./reset/route";
import { readLocalDb, writeLocalDb, hashPassword, makeId } from "@/utils/server-db";
import * as mailer from "@/utils/mailer";
import { NextRequest } from "next/server";

const mockSendMail = vi.fn().mockResolvedValue({ messageId: "msg-123" });
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail
    }))
  }
}));

describe("Password Reset Flow", () => {
  const testUser = {
    id: makeId("usr"),
    name: "Test Trader",
    email: "trader@example.com",
    salt: "testsalt",
    passwordHash: "oldhash",
    createdAt: new Date().toISOString()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: "msg-123" });

    // Prepare local test db
    const { salt, hash } = hashPassword("originalpassword123");
    testUser.salt = salt;
    testUser.passwordHash = hash;

    await writeLocalDb({
      users: [testUser],
      sessions: [{ token: "session-123", userId: testUser.id, createdAt: new Date().toISOString() }],
      trades: [],
      caseStudies: [],
      passwordResets: []
    });
  });

  describe("Mailer Utility", () => {
    it("getMailer returns a nodemailer transporter configured for gmail", () => {
      const transporter = mailer.getMailer();
      expect(transporter).toBeDefined();
      expect(typeof transporter.sendMail).toBe("function");
    });

    it("sendResetEmail attempts to send email with subject and reset link", async () => {
      const success = await mailer.sendResetEmail(
        "trader@example.com",
        "https://example.com/reset-password?token=testtoken"
      );

      expect(success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe("trader@example.com");
      expect(callArgs.subject).toBe("Reset your ForexLab Password");
      expect(callArgs.html).toContain("https://example.com/reset-password?token=testtoken");
      expect(callArgs.html).toContain("1 hour");
    });
  });

  describe("POST /api/auth/forgot", () => {
    it("returns generic message for non-existent email and creates no token", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/forgot", {
        method: "POST",
        body: JSON.stringify({ email: "nonexistent@example.com" })
      });

      const res = await forgotPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.message).toBe("If that email is registered, a password reset link has been sent.");

      const db = await readLocalDb();
      expect(db.passwordResets).toHaveLength(0);
    });

    it("generates a token and sends email for registered user", async () => {
      const sendEmailSpy = vi.spyOn(mailer, "sendResetEmail").mockResolvedValue(true);

      const req = new NextRequest("http://localhost:3000/api/auth/forgot", {
        method: "POST",
        body: JSON.stringify({ email: "TRADER@EXAMPLE.COM" }) // Case-insensitive
      });

      const res = await forgotPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.message).toBe("If that email is registered, a password reset link has been sent.");

      const db = await readLocalDb();
      expect(db.passwordResets).toHaveLength(1);
      const entry = db.passwordResets[0];
      expect(entry.userId).toBe(testUser.id);
      expect(entry.used).toBe(false);
      expect(entry.token).toBeDefined();

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(sendEmailSpy).toHaveBeenCalledWith(
        "trader@example.com",
        expect.stringContaining(`/reset-password?token=${entry.token}`),
        testUser.name
      );
    });
  });

  describe("GET /api/auth/reset (Token Validation)", () => {
    it("returns 400 when token query param is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/reset");
      const res = await resetGet(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.valid).toBe(false);
    });

    it("returns 400 when token is invalid or does not exist", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/reset?token=unknown-token");
      const res = await resetGet(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.valid).toBe(false);
      expect(json.error).toBe("Reset link is invalid or has expired.");
    });

    it("returns 400 when token is already used", async () => {
      const db = await readLocalDb();
      db.passwordResets.push({
        token: "used-token",
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        used: true
      });
      await writeLocalDb(db);

      const req = new NextRequest("http://localhost:3000/api/auth/reset?token=used-token");
      const res = await resetGet(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.valid).toBe(false);
      expect(json.error).toBe("Reset link is invalid or has expired.");
    });

    it("returns 400 when token has expired", async () => {
      const db = await readLocalDb();
      db.passwordResets.push({
        token: "expired-token",
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        used: false
      });
      await writeLocalDb(db);

      const req = new NextRequest("http://localhost:3000/api/auth/reset?token=expired-token");
      const res = await resetGet(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.valid).toBe(false);
      expect(json.error).toBe("Reset link is invalid or has expired.");
    });

    it("returns 200 { valid: true } when token is valid and unused", async () => {
      const db = await readLocalDb();
      db.passwordResets.push({
        token: "valid-token-xyz",
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        used: false
      });
      await writeLocalDb(db);

      const req = new NextRequest("http://localhost:3000/api/auth/reset?token=valid-token-xyz");
      const res = await resetGet(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.valid).toBe(true);
    });
  });

  describe("POST /api/auth/reset (Password Reset)", () => {
    it("returns 400 if token or password is missing", async () => {
      const req1 = new NextRequest("http://localhost:3000/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token: "tok" })
      });
      const res1 = await resetPost(req1);
      expect(res1.status).toBe(400);

      const req2 = new NextRequest("http://localhost:3000/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ password: "newpassword123" })
      });
      const res2 = await resetPost(req2);
      expect(res2.status).toBe(400);
    });

    it("returns 400 if password is less than 6 characters", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token: "tok", password: "123" })
      });
      const res = await resetPost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Password must be at least 6 characters long.");
    });

    it("successfully resets user password, marks token used, and clears sessions", async () => {
      const token = "secure-active-token-99";
      const db = await readLocalDb();
      db.passwordResets.push({
        token,
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        used: false
      });
      await writeLocalDb(db);

      const req = new NextRequest("http://localhost:3000/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token, password: "newSuperSecretPassword99!" })
      });

      const res = await resetPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);

      const updatedDb = await readLocalDb();
      const updatedUser = updatedDb.users.find((u) => u.id === testUser.id)!;
      expect(updatedUser.passwordHash).not.toBe(testUser.passwordHash);

      // Verify that the new password matches
      const { hash } = hashPassword("newSuperSecretPassword99!", updatedUser.salt);
      expect(updatedUser.passwordHash).toBe(hash);

      // Verify reset token marked used
      const resetEntry = updatedDb.passwordResets.find((r) => r.token === token)!;
      expect(resetEntry.used).toBe(true);

      // Verify user's old sessions invalidated
      expect(updatedDb.sessions.some((s) => s.userId === testUser.id)).toBe(false);

      // Verify token cannot be reused
      const reuseReq = new NextRequest("http://localhost:3000/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token, password: "anotherPassword123!" })
      });
      const reuseRes = await resetPost(reuseReq);
      expect(reuseRes.status).toBe(400);
      const reuseJson = await reuseRes.json();
      expect(reuseJson.error).toBe("Reset link is invalid or has expired.");
    });
  });
});
