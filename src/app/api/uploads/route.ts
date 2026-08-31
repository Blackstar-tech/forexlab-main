import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDataDir, makeId } from "@/utils/server-db";

export async function POST(req: NextRequest) {
  try {
    const { dataUrl } = await req.json();
    const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl || "");

    if (!match) {
      return NextResponse.json({ error: "Upload a valid image." }, { status: 400 });
    }

    const mime = match[1] === "image/jpg" ? "image/jpeg" : match[1];
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Image exceeds 8MB." }, { status: 413 });
    }

    const uploadsDir = path.join(getDataDir(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${makeId("shot")}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);

    return NextResponse.json({ url: `/api/uploads/${filename}` }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
