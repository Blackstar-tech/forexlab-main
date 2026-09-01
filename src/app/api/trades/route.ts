import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readLocalDb, writeLocalDb, useLocalDataStore, getSupabase, makeId } from "@/utils/server-db";
import { Trade } from "@/utils/types";

async function getAuthUser() {
  const token = cookies().get("fj_session")?.value;
  if (!token) return null;

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const session = db.sessions.find((s) => s.token === token);
    const user = session ? db.users.find((u) => u.id === session.userId) : null;
    return user ? { id: user.id, name: user.name, email: user.email } : null;
  }

  const { data: session } = await getSupabase()
    .from("sessions")
    .select("*, users(*)")
    .eq("token", token)
    .single();

  if (!session || !session.users) return null;
  return { id: session.users.id, name: session.users.name, email: session.users.email };
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const trades = (db.trades || [])
      .filter((t) => t.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ trades });
  }

  const { data: dbTrades, error } = await getSupabase()
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch trades." }, { status: 500 });
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
    lotSize: t.lot_size || null,
    riskPercent: t.risk_percent,
    plannedRr: t.planned_rr,
    rrAchieved: t.rr_achieved || "",
    pips: t.pips || null,
    pnl: t.pnl || 0,
    emotion: t.mood || "",
    sleepQuality: t.sleep_quality || "",
    confidence: t.confidence || "",
    rating: t.rating || 3,
    preTradeNotes: t.pre_trade_notes || "",
    notes: t.notes || "",
    screenshots: t.screenshots || { before: null, after: null, analysis: null },
    createdAt: t.created_at
  }));

  return NextResponse.json({ trades });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const tradeData: Trade = {
    id: makeId("trd"),
    userId: user.id,
    date: body.date,
    time: body.time || "",
    pair: body.pair,
    session: body.session || "",
    direction: body.direction === "sell" ? "sell" : "buy",
    result: body.result === "loss" ? "loss" : body.result === "breakeven" ? "breakeven" : "win",
    setup: body.setup,
    entryPrice: body.entryPrice ?? null,
    stopLoss: body.stopLoss ?? null,
    takeProfit: body.takeProfit ?? null,
    lotSize: body.lotSize ?? null,
    riskPercent: body.riskPercent ?? null,
    plannedRr: body.plannedRr ?? null,
    rrAchieved: body.rrAchieved || "",
    pips: body.pips ?? null,
    pnl: body.pnl || 0,
    emotion: body.emotion || "",
    sleepQuality: body.sleepQuality || "",
    confidence: body.confidence || "",
    rating: Math.max(1, Math.min(5, body.rating || 3)),
    preTradeNotes: body.preTradeNotes || "",
    notes: body.notes || "",
    screenshots: body.screenshots || { before: null, after: null, analysis: null },
    createdAt: new Date().toISOString()
  };

  if (!tradeData.date || !tradeData.pair || !tradeData.setup) {
    return NextResponse.json({ error: "Date, pair, and setup are required." }, { status: 400 });
  }

  if (useLocalDataStore) {
    const db = await readLocalDb();
    if (!db.trades) db.trades = [];
    db.trades.push(tradeData);
    await writeLocalDb(db);
    return NextResponse.json({ trade: tradeData }, { status: 201 });
  }

  const supabasePayload = {
    id: tradeData.id,
    user_id: user.id,
    date: tradeData.date,
    time: tradeData.time,
    pair: tradeData.pair,
    session: tradeData.session,
    direction: tradeData.direction,
    result: tradeData.result,
    setup: tradeData.setup,
    entry_price: tradeData.entryPrice,
    stop_loss: tradeData.stopLoss,
    take_profit: tradeData.takeProfit,
    lot_size: tradeData.lotSize,
    risk_percent: tradeData.riskPercent,
    planned_rr: tradeData.plannedRr,
    rr_achieved: tradeData.rrAchieved,
    pips: tradeData.pips,
    pnl: tradeData.pnl,
    mood: tradeData.emotion,
    sleep_quality: tradeData.sleepQuality,
    confidence: tradeData.confidence,
    rating: tradeData.rating,
    pre_trade_notes: tradeData.preTradeNotes,
    notes: tradeData.notes,
    screenshots: tradeData.screenshots,
    created_at: tradeData.createdAt
  };

  const { error } = await getSupabase().from("trades").insert([supabasePayload]);
  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message || "Failed to save trade." }, { status: 500 });
  }

  return NextResponse.json({ trade: tradeData }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Trade ID required" }, { status: 400 });
  }

  if (useLocalDataStore) {
    const db = await readLocalDb();
    db.trades = (db.trades || []).filter((t) => !(t.id === id && t.userId === user.id));
    await writeLocalDb(db);
    return NextResponse.json({ ok: true });
  }

  const { error } = await getSupabase().from("trades").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Failed to delete trade." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}