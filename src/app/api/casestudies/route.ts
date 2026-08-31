import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readLocalDb, writeLocalDb, useLocalDataStore, getSupabase, makeId } from "@/utils/server-db";
import { CaseStudy } from "@/utils/types";

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const caseStudies = (db.caseStudies || [])
      .filter((c) => c.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ caseStudies });
  }

  const { data, error } = await getSupabase()
    .from("case_studies")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch case studies." }, { status: 500 });

  const caseStudies: CaseStudy[] = (data || []).map((c) => ({
    id: c.id,
    userId: c.user_id,
    date: c.date,
    pair: c.pair,
    session: c.session || "",
    direction: c.direction,
    setup: c.setup,
    notes: c.notes || "",
    screenshots: c.screenshot ? (Array.isArray(c.screenshot) ? c.screenshot : [c.screenshot]) : [],
    createdAt: c.created_at
  }));

  return NextResponse.json({ caseStudies });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const caseStudyData: CaseStudy = {
    id: makeId("case"),
    userId: user.id,
    date: body.date,
    pair: body.pair,
    session: body.session || "",
    direction: body.direction === "sell" ? "sell" : "buy",
    setup: body.setup,
    notes: body.notes || "",
    screenshots: body.screenshots || [],
    createdAt: new Date().toISOString()
  };

  if (!caseStudyData.date || !caseStudyData.pair || !caseStudyData.setup) {
    return NextResponse.json({ error: "Date, pair, and setup are required." }, { status: 400 });
  }

  if (useLocalDataStore) {
    const db = await readLocalDb();
    if (!db.caseStudies) db.caseStudies = [];
    db.caseStudies.push(caseStudyData);
    await writeLocalDb(db);
    return NextResponse.json({ caseStudy: caseStudyData }, { status: 201 });
  }

  const { error } = await getSupabase().from("case_studies").insert([
    {
      id: caseStudyData.id,
      user_id: user.id,
      date: caseStudyData.date,
      pair: caseStudyData.pair,
      session: caseStudyData.session,
      direction: caseStudyData.direction,
      setup: caseStudyData.setup,
      notes: caseStudyData.notes,
      screenshot: JSON.stringify(caseStudyData.screenshots),
      created_at: caseStudyData.createdAt
    }
  ]);

  if (error) return NextResponse.json({ error: "Failed to save case study." }, { status: 500 });
  return NextResponse.json({ caseStudy: caseStudyData }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (useLocalDataStore) {
    const db = await readLocalDb();
    db.caseStudies = (db.caseStudies || []).filter((c) => !(c.id === id && c.userId === user.id));
    await writeLocalDb(db);
    return NextResponse.json({ ok: true });
  }

  const { error } = await getSupabase().from("case_studies").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
