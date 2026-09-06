import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readLocalDb, useLocalDataStore, getSupabase } from "@/utils/server-db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = cookies().get("fj_session")?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const session = db.sessions.find((s) => s.token === token);
    const user = session ? db.users.find((u) => u.id === session.userId) : null;
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const { data: session, error } = await getSupabase()
    .from("sessions")
    .select("*, users(*)")
    .eq("token", token)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[Auth/Me] Session query error:", {
        code: error.code,
        message: error.message,
        details: error.details
      });
    }
    return NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  if (!session || !session.users) {
    return NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const user = session.users;
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
