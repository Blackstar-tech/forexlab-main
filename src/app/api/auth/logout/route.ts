import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readLocalDb, writeLocalDb, useLocalDataStore, getSupabase } from "@/utils/server-db";

export async function POST() {
  try {
    const token = cookies().get("fj_session")?.value;
    if (token) {
      if (useLocalDataStore) {
        const db = await readLocalDb();
        db.sessions = (db.sessions || []).filter((s) => s.token !== token);
        await writeLocalDb(db);
      } else {
        const { error } = await getSupabase().from("sessions").delete().eq("token", token);
        if (error) {
          console.error("[Logout] Error deleting session:", error);
        }
      }
    }
  } catch (err) {
    console.error("[Logout] Unexpected error during logout:", err);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("fj_session", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
    maxAge: 0
  });
  return response;
}
