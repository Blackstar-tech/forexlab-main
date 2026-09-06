import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST, DELETE } from "./route";
import { readLocalDb, writeLocalDb, makeId } from "@/utils/server-db";
import { NextRequest } from "next/server";

let mockCookieToken: string | undefined = "session-123";

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      if (name === "fj_session" && mockCookieToken) {
        return { value: mockCookieToken };
      }
      return undefined;
    }
  })
}));

describe("Balance Checkpoints API Route", () => {
  const testUserId = makeId("usr");
  const testUser = {
    id: testUserId,
    name: "Trader Test",
    email: "checkpoint_test@example.com",
    salt: "salt123",
    passwordHash: "hash123",
    createdAt: new Date().toISOString()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCookieToken = "session-123";

    await writeLocalDb({
      users: [testUser],
      sessions: [{ token: "session-123", userId: testUserId, createdAt: new Date().toISOString() }],
      trades: [],
      caseStudies: [],
      passwordResets: [],
      balanceCheckpoints: []
    });
  });

  describe("Authentication", () => {
    it("returns 401 Unauthorized if no session cookie exists", async () => {
      mockCookieToken = undefined;
      const res = await GET();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/balance-checkpoints", () => {
    it("rejects invalid balance values", async () => {
      const req = new NextRequest("http://localhost:3000/api/balance-checkpoints", {
        method: "POST",
        body: JSON.stringify({ balance: "invalid" })
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid balance value.");
    });

    it("creates a balance checkpoint with current timestamp if effectiveFrom is omitted", async () => {
      const req = new NextRequest("http://localhost:3000/api/balance-checkpoints", {
        method: "POST",
        body: JSON.stringify({ balance: 15000 })
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.checkpoint).toBeDefined();
      expect(json.checkpoint.balance).toBe(15000);
      expect(json.checkpoint.userId).toBe(testUserId);
      expect(json.checkpoint.effectiveFrom).toBeDefined();

      const db = await readLocalDb();
      expect(db.balanceCheckpoints).toHaveLength(1);
      expect(db.balanceCheckpoints[0].balance).toBe(15000);
    });

    it("creates a balance checkpoint with specific effectiveFrom date", async () => {
      const req = new NextRequest("http://localhost:3000/api/balance-checkpoints", {
        method: "POST",
        body: JSON.stringify({ balance: 25000, effectiveFrom: "2026-09-01T00:00:00.000Z" })
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.checkpoint.balance).toBe(25000);
      expect(json.checkpoint.effectiveFrom).toBe("2026-09-01T00:00:00.000Z");
    });
  });

  describe("GET /api/balance-checkpoints", () => {
    it("returns user checkpoints sorted chronologically by effectiveFrom", async () => {
      const db = await readLocalDb();
      db.balanceCheckpoints = [
        {
          id: "cp2",
          userId: testUserId,
          balance: 20000,
          effectiveFrom: "2026-09-05T10:00:00.000Z",
          createdAt: "2026-09-05T10:00:00.000Z"
        },
        {
          id: "cp1",
          userId: testUserId,
          balance: 10000,
          effectiveFrom: "2026-09-01T10:00:00.000Z",
          createdAt: "2026-09-01T10:00:00.000Z"
        },
        {
          id: "cp_other",
          userId: "other_user",
          balance: 99999,
          effectiveFrom: "2026-09-03T10:00:00.000Z",
          createdAt: "2026-09-03T10:00:00.000Z"
        }
      ];
      await writeLocalDb(db);

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.checkpoints).toHaveLength(2);
      expect(json.checkpoints[0].id).toBe("cp1");
      expect(json.checkpoints[1].id).toBe("cp2");
    });
  });

  describe("DELETE /api/balance-checkpoints", () => {
    it("requires checkpoint ID parameter", async () => {
      const req = new NextRequest("http://localhost:3000/api/balance-checkpoints", { method: "DELETE" });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Checkpoint ID required");
    });

    it("returns 404 if checkpoint does not belong to user or does not exist", async () => {
      const req = new NextRequest("http://localhost:3000/api/balance-checkpoints?id=nonexistent", {
        method: "DELETE"
      });
      const res = await DELETE(req);
      expect(res.status).toBe(404);
    });

    it("deletes user checkpoint successfully", async () => {
      const db = await readLocalDb();
      db.balanceCheckpoints = [
        {
          id: "cp_to_delete",
          userId: testUserId,
          balance: 12000,
          effectiveFrom: "2026-09-02T10:00:00.000Z",
          createdAt: "2026-09-02T10:00:00.000Z"
        }
      ];
      await writeLocalDb(db);

      const req = new NextRequest("http://localhost:3000/api/balance-checkpoints?id=cp_to_delete", {
        method: "DELETE"
      });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);

      const updatedDb = await readLocalDb();
      expect(updatedDb.balanceCheckpoints).toHaveLength(0);
    });
  });
});
