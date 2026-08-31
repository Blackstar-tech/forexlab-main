import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, message: "If that email is registered, a password reset link has been sent." });
}
