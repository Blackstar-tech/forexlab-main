import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { readLocalDb, writeLocalDb, useLocalDataStore, getSupabase } from "@/utils/server-db";
import { sendResetEmail, getRequestOrigin } from "@/utils/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const genericResponse = {
    ok: true,
    message: "If that email is registered, a password reset link has been sent."
  };

  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email;
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(genericResponse);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || getRequestOrigin(req) || "http://localhost:3000").replace(/\/+$/, "");
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    if (useLocalDataStore) {
      const db = await readLocalDb();
      const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

      if (!user) {
        console.log(`[Forgot Password] Local DB: No user found with email ${cleanEmail}`);
        return NextResponse.json(genericResponse);
      }

      db.passwordResets.push({
        token,
        userId: user.id,
        expiresAt,
        used: false
      });
      await writeLocalDb(db);

      await sendResetEmail(user.email, resetUrl, user.name);

      return NextResponse.json(genericResponse);
    }

    // Supabase flow
    const { data: user, error: userError } = await getSupabase()
      .from("users")
      .select("id, name, email")
      .eq("email", cleanEmail)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        console.log(`[Forgot Password] Supabase: No user found for email ${cleanEmail}`);
      } else {
        console.error("[Forgot Password] Supabase user query error:", userError);
      }
      return NextResponse.json(genericResponse);
    }

    if (!user) {
      return NextResponse.json(genericResponse);
    }

    const createdAt = new Date().toISOString();
    const { error: resetError } = await getSupabase()
      .from("password_resets")
      .insert([
        {
          token,
          user_id: user.id,
          expires_at: expiresAt,
          used: false,
          created_at: createdAt
        }
      ]);

    if (resetError) {
      console.error("[Forgot Password] Supabase reset token insert failed:", resetError);
      return NextResponse.json(genericResponse);
    }

    await sendResetEmail(user.email, resetUrl, user.name);

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("[Forgot Password] Unexpected error:", error);
    return NextResponse.json(genericResponse);
  }
}
