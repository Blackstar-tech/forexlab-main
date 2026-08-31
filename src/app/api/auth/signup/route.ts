import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { readLocalDb, writeLocalDb, useLocalDataStore, getSupabase, hashPassword, makeId } from "@/utils/server-db";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    if (useLocalDataStore) {
      const db = await readLocalDb();
      if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return NextResponse.json({ error: "Email already registered." }, { status: 400 });
      }

      const { salt, hash } = hashPassword(password);
      const user = {
        id: makeId("usr"),
        name: cleanName,
        email: cleanEmail,
        salt,
        passwordHash: hash,
        createdAt: new Date().toISOString()
      };

      const token = crypto.randomBytes(32).toString("hex");
      db.users.push(user);
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

    const { data: existing } = await getSupabase().from("users").select("id").eq("email", cleanEmail).single();
    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 400 });
    }

    const { salt, hash } = hashPassword(password);
    const userId = makeId("usr");
    await getSupabase().from("users").insert([
      { id: userId, name: cleanName, email: cleanEmail, salt, password_hash: hash, created_at: new Date().toISOString() }
    ]);

    const token = crypto.randomBytes(32).toString("hex");
    await getSupabase().from("sessions").insert([{ token, user_id: userId, created_at: new Date().toISOString() }]);

    cookies().set("fj_session", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30
    });

    return NextResponse.json({ user: { id: userId, name: cleanName, email: cleanEmail } });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
