import { NextRequest, NextResponse } from "next/server";
import { readLocalDb, writeLocalDb, useLocalDataStore, getSupabase, hashPassword } from "@/utils/server-db";

export const dynamic = "force-dynamic";

// GET /api/auth/reset?token=... -> Validate token status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = (searchParams.get("token") || "").trim();

    if (!token) {
      return NextResponse.json({ valid: false, error: "Missing reset token." }, { status: 400 });
    }

    if (useLocalDataStore) {
      const db = await readLocalDb();
      const reset = (db.passwordResets || []).find((r) => r.token === token);

      if (!reset || reset.used || new Date(reset.expiresAt).getTime() <= Date.now()) {
        return NextResponse.json({ valid: false, error: "Reset link is invalid or has expired." }, { status: 400 });
      }

      return NextResponse.json({ valid: true });
    }

    const { data: reset, error } = await getSupabase()
      .from("password_resets")
      .select("token, used, expires_at")
      .eq("token", token)
      .single();

    if (error || !reset || reset.used || new Date(reset.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ valid: false, error: "Reset link is invalid or has expired." }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("[Reset Password GET] Token validation error:", error);
    return NextResponse.json({ valid: false, error: "Failed to validate reset link." }, { status: 500 });
  }
}

// POST /api/auth/reset -> Set new password
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body.token || "").trim();
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    if (useLocalDataStore) {
      const db = await readLocalDb();
      const reset = (db.passwordResets || []).find((r) => r.token === token);

      if (!reset || reset.used || new Date(reset.expiresAt).getTime() <= Date.now()) {
        return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
      }

      const user = db.users.find((u) => u.id === reset.userId);
      if (!user) {
        return NextResponse.json({ error: "User account not found." }, { status: 400 });
      }

      const { salt, hash } = hashPassword(password);
      user.salt = salt;
      user.passwordHash = hash;
      reset.used = true;

      // Invalidate all active sessions for this user
      db.sessions = (db.sessions || []).filter((s) => s.userId !== reset.userId);
      await writeLocalDb(db);

      console.log(`[Reset Password] Local DB: Successfully reset password for user ${user.email}`);
      return NextResponse.json({
        ok: true,
        message: "Password updated successfully! You can now sign in with your new password."
      });
    }

    // Supabase flow
    const { data: reset, error: resetFetchError } = await getSupabase()
      .from("password_resets")
      .select("*")
      .eq("token", token)
      .single();

    if (resetFetchError || !reset || reset.used || new Date(reset.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
    }

    const { salt, hash } = hashPassword(password);

    // 1. Update user password
    const { error: userUpdateError } = await getSupabase()
      .from("users")
      .update({
        salt,
        password_hash: hash
      })
      .eq("id", reset.user_id);

    if (userUpdateError) {
      console.error("[Reset Password] Failed to update user password in Supabase:", userUpdateError);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    // 2. Mark reset token as used
    const { error: tokenUpdateError } = await getSupabase()
      .from("password_resets")
      .update({ used: true })
      .eq("token", token);

    if (tokenUpdateError) {
      console.error("[Reset Password] Failed to mark reset token as used in Supabase:", tokenUpdateError);
    }

    // 3. Invalidate all active sessions
    const { error: sessionDeleteError } = await getSupabase()
      .from("sessions")
      .delete()
      .eq("user_id", reset.user_id);

    if (sessionDeleteError) {
      console.error("[Reset Password] Failed to delete existing sessions in Supabase:", sessionDeleteError);
    }

    console.log(`[Reset Password] Supabase: Successfully reset password for user_id ${reset.user_id}`);
    return NextResponse.json({
      ok: true,
      message: "Password updated successfully! You can now sign in with your new password."
    });
  } catch (error) {
    console.error("[Reset Password POST] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
