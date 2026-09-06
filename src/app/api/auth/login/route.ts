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

      const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
      response.cookies.set("fj_session", token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30
      });

      return response;
    }

    const { data: user, error: userError } = await getSupabase()
      .from("users")
      .select("*")
      .eq("email", cleanEmail)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        console.warn(`[Login] No user found for email: ${cleanEmail}`);
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      console.error("[Login] Supabase user query error:", {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint
      });
      return NextResponse.json({ error: "Authentication service unavailable." }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { hash } = hashPassword(password, user.salt);
    if (hash !== user.password_hash) {
      console.warn(`[Login] Password mismatch for email: ${cleanEmail}`);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const { error: sessionError } = await getSupabase()
      .from("sessions")
      .insert([{ token, user_id: user.id, created_at: new Date().toISOString() }]);

    if (sessionError) {
      console.error("[Login] Failed to create session:", {
        code: sessionError.code,
        message: sessionError.message,
        details: sessionError.details
      });
      return NextResponse.json({ error: "Failed to create session." }, { status: 500 });
    }

    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    response.cookies.set("fj_session", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    console.error("[Login] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
