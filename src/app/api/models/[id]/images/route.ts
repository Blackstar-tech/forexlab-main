import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { getSupabase, readLocalDb, useLocalDataStore, writeLocalDb } from "@/utils/server-db";
import { getModelUser } from "@/utils/model-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
type SupportedImage = { mime: "image/png" | "image/jpeg" | "image/webp"; ext: "png" | "jpg" | "webp" };

function detectImage(bytes: Buffer): SupportedImage | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mime: "image/png", ext: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

async function getOwnedModel(userId: string, id: string) {
  if (useLocalDataStore) {
    const db = await readLocalDb();
    const model = (db.modelResults || []).find((item) => item.id === id && item.userId === userId);
    return model ? { db, model } : null;
  }
  const { data, error } = await getSupabase().from("model_results")
    .select("id,user_id,image_paths")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return { model: { id: data.id, userId: data.user_id, imagePaths: Array.isArray(data.image_paths) ? data.image_paths as string[] : [] } };
}

export async function POST(req: NextRequest, context: { params: { id: string } }) {
  const user = await getModelUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await getOwnedModel(user.id, context.params.id);
  if (!owned) return NextResponse.json({ error: "Model not found." }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image files can be uploaded." }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Each image must be 5 MB or smaller after compression." }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const image = detectImage(bytes);
  if (!image) return NextResponse.json({ error: "Use a PNG, JPEG, or WebP image." }, { status: 400 });
  const imagePath = `${user.id}/${context.params.id}/${randomUUID()}.${image.ext}`;

  if (useLocalDataStore && "db" in owned) {
    const destination = path.join(process.cwd(), ".data", "model-charts", user.id, context.params.id, path.basename(imagePath));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
    owned.model.imagePaths.push(imagePath);
    await writeLocalDb(owned.db!);
    return NextResponse.json({ imagePath, url: `/api/models/${context.params.id}/images?name=${encodeURIComponent(path.basename(imagePath))}` }, { status: 201 });
  }

  const { error: uploadError } = await getSupabase().storage.from("model-charts").upload(imagePath, bytes, {
    contentType: image.mime,
    upsert: false
  });
  if (uploadError) {
    console.error("[Models image upload] Supabase error:", uploadError.message);
    return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 });
  }

  const nextPaths = [...owned.model.imagePaths, imagePath];
  const { error: updateError } = await getSupabase().from("model_results")
    .update({ image_paths: nextPaths })
    .eq("id", context.params.id)
    .eq("user_id", user.id);
  if (updateError) {
    await getSupabase().storage.from("model-charts").remove([imagePath]);
    console.error("[Models image upload] Could not link image:", updateError.message);
    return NextResponse.json({ error: "Image uploaded but could not be attached to the model." }, { status: 500 });
  }
  const { data: signed, error: signError } = await getSupabase().storage.from("model-charts").createSignedUrl(imagePath, 60 * 60 * 24);
  if (signError) return NextResponse.json({ error: "Image uploaded but could not create a display link." }, { status: 500 });
  return NextResponse.json({ imagePath, url: signed.signedUrl }, { status: 201 });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const user = await getModelUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filename = new URL(req.url).searchParams.get("name");
  if (!filename || path.basename(filename) !== filename) return NextResponse.json({ error: "Image name required." }, { status: 400 });
  const owned = await getOwnedModel(user.id, context.params.id);
  if (!owned) return NextResponse.json({ error: "Model not found." }, { status: 404 });
  const imagePath = owned.model.imagePaths.find((item) => item.startsWith(`${user.id}/${context.params.id}/`) && item.split("/").pop() === filename);
  if (!imagePath) return NextResponse.json({ error: "Image not found." }, { status: 404 });

  const nextPaths = owned.model.imagePaths.filter((item) => item !== imagePath);
  if (useLocalDataStore && "db" in owned) {
    owned.model.imagePaths = nextPaths;
    await writeLocalDb(owned.db!);
    await fs.rm(path.join(process.cwd(), ".data", "model-charts", user.id, context.params.id, filename), { force: true });
    return NextResponse.json({ ok: true });
  }

  const client = getSupabase();
  const { error: updateError } = await client.from("model_results").update({ image_paths: nextPaths })
    .eq("id", context.params.id).eq("user_id", user.id);
  if (updateError) return NextResponse.json({ error: "Failed to remove image from model." }, { status: 500 });
  const { error: removeError } = await client.storage.from("model-charts").remove([imagePath]);
  if (removeError) return NextResponse.json({ error: "Image could not be deleted from storage." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const user = await getModelUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filename = new URL(req.url).searchParams.get("name");
  if (!filename || path.basename(filename) !== filename) return NextResponse.json({ error: "Image name required." }, { status: 400 });
  const owned = await getOwnedModel(user.id, context.params.id);
  if (!owned) return NextResponse.json({ error: "Model not found." }, { status: 404 });
  const imagePath = owned.model.imagePaths.find((item) => item.startsWith(`${user.id}/${context.params.id}/`) && item.split("/").pop() === filename);
  if (!imagePath) return NextResponse.json({ error: "Image not found." }, { status: 404 });

  if (useLocalDataStore) {
    const filePath = path.join(process.cwd(), ".data", "model-charts", user.id, context.params.id, filename);
    try {
      const bytes = await fs.readFile(filePath);
      const image = detectImage(bytes);
      if (!image) return NextResponse.json({ error: "Invalid stored image." }, { status: 415 });
      return new NextResponse(new Uint8Array(bytes), {
        headers: { "Content-Type": image.mime, "Cache-Control": "private, max-age=3600" }
      });
    } catch {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
  }

  const { data, error } = await getSupabase().storage.from("model-charts").createSignedUrl(imagePath, 60 * 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Could not open image." }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
