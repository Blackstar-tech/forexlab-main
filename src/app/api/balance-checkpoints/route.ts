import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readLocalDb, writeLocalDb, useLocalDataStore, getSupabase, makeId } from "@/utils/server-db";
import { BalanceCheckpoint } from "@/utils/types";

export const dynamic = "force-dynamic";

async function getAuthUser() {
  const token = cookies().get("fj_session")?.value;
  if (!token) return null;

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const session = db.sessions.find((s) => s.token === token);
    const user = session ? db.users.find((u) => u.id === session.userId) : null;
    return user ? { id: user.id, name: user.name, email: user.email } : null;
  }

  const { data: session, error } = await getSupabase()
    .from("sessions")
    .select("*, users(*)")
    .eq("token", token)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[balance_checkpoints getAuthUser] Error fetching session:", error);
    }
    return null;
  }

  if (!session || !session.users) return null;
  return { id: session.users.id, name: session.users.name, email: session.users.email };
}

// GET /api/balance-checkpoints -> List user checkpoints ordered by effective_from asc
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const checkpoints = (db.balanceCheckpoints || [])
      .filter((c) => c.userId === user.id)
      .sort((a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime());
    return NextResponse.json({ checkpoints });
  }

  const { data, error } = await getSupabase()
    .from("balance_checkpoints")
    .select("*")
    .eq("user_id", user.id)
    .order("effective_from", { ascending: true });

  if (error) {
    console.error("[balance_checkpoints GET] Supabase error:", error);
    return NextResponse.json({ error: "Failed to fetch checkpoints." }, { status: 500 });
  }

  const checkpoints: BalanceCheckpoint[] = (data || []).map((c) => ({
    id: String(c.id),
    userId: c.user_id,
    balance: Number(c.balance) || 0,
    effectiveFrom: c.effective_from,
    createdAt: c.created_at
  }));

  return NextResponse.json({ checkpoints });
}

// POST /api/balance-checkpoints -> Create a new balance checkpoint
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawBalance = parseFloat(body.balance);

    if (isNaN(rawBalance) || rawBalance < 0) {
      return NextResponse.json({ error: "Invalid balance value." }, { status: 400 });
    }

    const effectiveFrom =
      typeof body.effectiveFrom === "string" && body.effectiveFrom.trim()
        ? body.effectiveFrom.trim()
        : new Date().toISOString();

    const now = new Date().toISOString();
    const checkpointId = makeId("bcp");

    if (useLocalDataStore) {
      const db = await readLocalDb();
      const newCheckpoint: BalanceCheckpoint = {
        id: checkpointId,
        userId: user.id,
        balance: rawBalance,
        effectiveFrom,
        createdAt: now
      };

      if (!Array.isArray(db.balanceCheckpoints)) {
        db.balanceCheckpoints = [];
      }
      db.balanceCheckpoints.push(newCheckpoint);
      await writeLocalDb(db);

      return NextResponse.json({ ok: true, checkpoint: newCheckpoint });
    }

    // Supabase insert
    const insertPayload = {
      id: checkpointId,
      user_id: user.id,
      balance: rawBalance,
      effective_from: effectiveFrom,
      created_at: now
    };

    const { data, error } = await getSupabase()
      .from("balance_checkpoints")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error("[balance_checkpoints POST] Supabase insert error:", error);
      return NextResponse.json({ error: "Failed to create checkpoint." }, { status: 500 });
    }

    const createdCheckpoint: BalanceCheckpoint = {
      id: String(data?.id || checkpointId),
      userId: user.id,
      balance: rawBalance,
      effectiveFrom,
      createdAt: now
    };

    return NextResponse.json({ ok: true, checkpoint: createdCheckpoint });
  } catch (err) {
    console.error("[balance_checkpoints POST] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// DELETE /api/balance-checkpoints?id=... -> Delete a balance checkpoint
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Checkpoint ID required" }, { status: 400 });
  }

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const initialLen = (db.balanceCheckpoints || []).length;
    db.balanceCheckpoints = (db.balanceCheckpoints || []).filter(
      (c) => !(c.id === id && c.userId === user.id)
    );
    if (db.balanceCheckpoints.length === initialLen) {
      return NextResponse.json({ error: "Checkpoint not found." }, { status: 404 });
    }
    await writeLocalDb(db);
    return NextResponse.json({ ok: true });
  }

  const { error } = await getSupabase()
    .from("balance_checkpoints")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[balance_checkpoints DELETE] Supabase error:", error);
    return NextResponse.json({ error: "Failed to delete checkpoint." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
