import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  cookies().set("fj_session", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0)
  });
  return NextResponse.json({ ok: true });
}
