import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabase, readLocalDb, useLocalDataStore, writeLocalDb } from "@/utils/server-db";
import { ModelCategory, ModelOutcome, ModelResult, ModelType } from "@/utils/types";
import { getModelUser } from "@/utils/model-auth";

export const dynamic = "force-dynamic";

const CATEGORIES: ModelCategory[] = ["Chart analysis", "Backtest", "Forward test", "Trade idea", "Case study"];
const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "Daily", "Weekly", "Monthly"];
const OUTCOMES: ModelOutcome[] = ["win", "loss", "breakeven"];

interface ModelFields {
  category: ModelCategory;
  instrument: string;
  timeframes: string[];
  title: string;
  subtitle: string;
  modelDate: string;
  type: ModelType;
  notes: string;
  outcome: ModelOutcome | null;
  resultR: number | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
}

type CleanResult = { value: ModelFields } | { error: string };

function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanFields(body: Record<string, unknown>): CleanResult {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
  const category = CATEGORIES.includes(body.category as ModelCategory) ? body.category as ModelCategory : "Chart analysis";
  const type: ModelType = body.type === "forward" ? "forward" : "backtest";
  const modelDate = typeof body.modelDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.modelDate)
    ? body.modelDate
    : "";
  const parsedDate = modelDate ? new Date(`${modelDate}T00:00:00.000Z`) : null;
  const selectedTimeframes = Array.isArray(body.timeframes)
    ? new Set(body.timeframes.filter((frame): frame is string => typeof frame === "string" && TIMEFRAMES.includes(frame)))
    : new Set<string>();
  const timeframes = TIMEFRAMES.filter((frame) => selectedTimeframes.has(frame));
  const outcome = OUTCOMES.includes(body.outcome as ModelOutcome) ? body.outcome as ModelOutcome : null;
  const numberFields = [body.resultR, body.entry, body.stopLoss, body.takeProfit];
  if (numberFields.some((value) => value !== null && value !== undefined && value !== "" && numericOrNull(value) === null)) {
    return { error: "Result values must be valid numbers." };
  }
  if (!title || !modelDate || !parsedDate || parsedDate.toISOString().slice(0, 10) !== modelDate) {
    return { error: "A valid title and date are required." };
  }

  return {
    value: {
      category,
      instrument: typeof body.instrument === "string" ? body.instrument.trim().toUpperCase().slice(0, 32) : "",
      timeframes,
      title,
      subtitle: typeof body.subtitle === "string" ? body.subtitle.trim().slice(0, 240) : "",
      modelDate,
      type,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 20000) : "",
      outcome,
      resultR: numericOrNull(body.resultR),
      entry: numericOrNull(body.entry),
      stopLoss: numericOrNull(body.stopLoss),
      takeProfit: numericOrNull(body.takeProfit)
    }
  };
}

function fromRow(row: Record<string, unknown>, imageUrls: string[] = []): ModelResult {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    category: row.category as ModelCategory,
    instrument: String(row.instrument || ""),
    timeframes: Array.isArray(row.timeframes) ? row.timeframes as string[] : [],
    title: String(row.title || ""),
    subtitle: String(row.subtitle || ""),
    modelDate: String(row.model_date || ""),
    type: row.type === "forward" ? "forward" : "backtest",
    notes: String(row.notes || ""),
    imagePaths: Array.isArray(row.image_paths) ? row.image_paths as string[] : [],
    imageUrls,
    outcome: OUTCOMES.includes(row.outcome as ModelOutcome) ? row.outcome as ModelOutcome : null,
    resultR: numericOrNull(row.result_r),
    entry: numericOrNull(row.entry),
    stopLoss: numericOrNull(row.stop_loss),
    takeProfit: numericOrNull(row.take_profit),
    createdAt: String(row.created_at || "")
  };
}

async function addImageUrls(rows: Array<Record<string, unknown>>, userId: string): Promise<ModelResult[]> {
  return Promise.all(rows.map(async (row) => {
    const paths = Array.isArray(row.image_paths) ? row.image_paths as string[] : [];
    if (useLocalDataStore) {
      const id = encodeURIComponent(String(row.id));
      const imageUrls = paths.map((imagePath) => `/api/models/${id}/images?name=${encodeURIComponent(imagePath.split("/").pop() || "")}`);
      return fromRow({ ...row, user_id: userId }, imageUrls);
    }
    const signed = await Promise.all(paths.map(async (imagePath) => {
      const { data, error } = await getSupabase().storage.from("model-charts").createSignedUrl(imagePath, 60 * 60 * 24);
      if (error) {
        console.error("[Models] Could not sign chart image:", error.message);
        return "";
      }
      return data.signedUrl;
    }));
    return fromRow({ ...row, user_id: userId }, signed);
  }));
}

function supabasePayload(value: ModelFields) {
  return {
    category: value.category,
    instrument: value.instrument,
    timeframes: value.timeframes,
    title: value.title,
    subtitle: value.subtitle,
    model_date: value.modelDate,
    type: value.type,
    notes: value.notes,
    outcome: value.outcome,
    result_r: value.resultR,
    entry: value.entry,
    stop_loss: value.stopLoss,
    take_profit: value.takeProfit
  };
}

export async function GET() {
  const user = await getModelUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const rows = (db.modelResults || [])
      .filter((model) => model.userId === user.id)
      .sort((a, b) => b.modelDate.localeCompare(a.modelDate))
      .map((model) => ({
        id: model.id,
        user_id: model.userId,
        category: model.category,
        instrument: model.instrument,
        timeframes: model.timeframes,
        title: model.title,
        subtitle: model.subtitle,
        model_date: model.modelDate,
        model_type: model.type,
        notes: model.notes,
        image_paths: model.imagePaths,
        outcome: model.outcome,
        result_r: model.resultR,
        entry: model.entry,
        stop_loss: model.stopLoss,
        take_profit: model.takeProfit,
        created_at: model.createdAt
      }));
    return NextResponse.json({ models: await addImageUrls(rows, user.id) });
  }

  const { data, error } = await getSupabase()
    .from("model_results")
    .select("*")
    .eq("user_id", user.id)
    .order("model_date", { ascending: false });
  if (error) {
    console.error("[Models GET] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load models." }, { status: 500 });
  }
  return NextResponse.json({ models: await addImageUrls((data || []) as Array<Record<string, unknown>>, user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getModelUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid model data." }, { status: 400 });
  const cleaned = cleanFields(body as Record<string, unknown>);
  if ("error" in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 });

  const model: ModelResult = {
    id: randomUUID(),
    userId: user.id,
    ...cleaned.value,
    imagePaths: [],
    imageUrls: [],
    createdAt: new Date().toISOString()
  };
  if (useLocalDataStore) {
    const db = await readLocalDb();
    (db.modelResults ||= []).push(model);
    await writeLocalDb(db);
    return NextResponse.json({ model }, { status: 201 });
  }

  const { data, error } = await getSupabase().from("model_results").insert([{
    id: model.id,
    user_id: user.id,
    ...supabasePayload(cleaned.value),
    image_paths: [],
    created_at: model.createdAt
  }]).select("*").single();
  if (error) {
    console.error("[Models POST] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to save model." }, { status: 500 });
  }
  return NextResponse.json({ model: fromRow(data as Record<string, unknown>) }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await getModelUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Model ID required." }, { status: 400 });
  const cleaned = cleanFields(body as Record<string, unknown>);
  if ("error" in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 });

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const model = (db.modelResults || []).find((item) => item.id === body.id && item.userId === user.id);
    if (!model) return NextResponse.json({ error: "Model not found." }, { status: 404 });
    Object.assign(model, cleaned.value);
    await writeLocalDb(db);
    return NextResponse.json({ model });
  }

  const { data, error } = await getSupabase().from("model_results")
    .update(supabasePayload(cleaned.value))
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[Models PUT] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update model." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Model not found." }, { status: 404 });
  return NextResponse.json({ model: fromRow(data as Record<string, unknown>) });
}

export async function DELETE(req: NextRequest) {
  const user = await getModelUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Model ID required." }, { status: 400 });

  if (useLocalDataStore) {
    const db = await readLocalDb();
    db.modelResults = (db.modelResults || []).filter((model) => !(model.id === id && model.userId === user.id));
    await writeLocalDb(db);
    const fs = await import("fs/promises");
    const path = await import("path");
    const imageDir = path.join(process.cwd(), ".data", "model-charts", user.id, id);
    await fs.rm(imageDir, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  }

  const client = getSupabase();
  const { data: model, error: lookupError } = await client.from("model_results")
    .select("image_paths")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Failed to find model." }, { status: 500 });
  if (!model) return NextResponse.json({ error: "Model not found." }, { status: 404 });
  const paths = Array.isArray(model.image_paths) ? model.image_paths as string[] : [];
  if (paths.length) {
    const { error: storageError } = await client.storage.from("model-charts").remove(paths);
    if (storageError) return NextResponse.json({ error: "Could not delete the model images." }, { status: 500 });
  }
  const { error } = await client.from("model_results").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to delete model." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
