import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { readLocalDb, writeLocalDb, useLocalDataStore, getSupabase, hashPassword } from "@/utils/server-db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (useLocalDataStore) {
      const db = await readLocalDb();
      const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      const { hash } = hashPassword(password, user.salt);
      if (hash !== user.passwordHash) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      const token = crypto.randomBytes(32).toString("hex");
      db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
      await writeLocalDb(db);

      cookies().set("fj_session", token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30
      });

      return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    }

    const { data: user } = await getSupabase()
      .from("users")
      .select("*")
      .eq("email", cleanEmail)
      .single();

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { hash } = hashPassword(password, user.salt);
    if (hash !== user.password_hash) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await getSupabase().from("sessions").insert([{ token, user_id: user.id, created_at: new Date().toISOString() }]);

    cookies().set("fj_session", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30
    });

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
