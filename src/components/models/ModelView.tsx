"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ModelCategory, ModelOutcome, ModelResult, ModelType } from "@/utils/types";

interface Props {
  onShowToast: (message: string) => void;
}

type ModelTab = ModelType | "compare";
interface Draft {
  category: ModelCategory;
  instrument: string;
  timeframes: string[];
  title: string;
  subtitle: string;
  modelDate: string;
  type: ModelType;
  notes: string;
  outcome: ModelOutcome | "";
  resultR: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
}

const CATEGORIES: ModelCategory[] = ["Chart analysis", "Backtest", "Forward test", "Trade idea", "Case study"];
const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "Daily", "Weekly", "Monthly"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function emptyDraft(type: ModelType = "backtest"): Draft {
  return {
    category: "Chart analysis",
    instrument: "",
    timeframes: [],
    title: "",
    subtitle: "",
    modelDate: localDate(),
    type,
    notes: "",
    outcome: "",
    resultR: "",
    entry: "",
    stopLoss: "",
    takeProfit: ""
  };
}

function draftFromModel(model: ModelResult): Draft {
  return {
    category: model.category,
    instrument: model.instrument,
    timeframes: [...model.timeframes],
    title: model.title,
    subtitle: model.subtitle,
    modelDate: model.modelDate,
    type: model.type,
    notes: model.notes,
    outcome: model.outcome || "",
    resultR: model.resultR === null ? "" : String(model.resultR),
    entry: model.entry === null ? "" : String(model.entry),
    stopLoss: model.stopLoss === null ? "" : String(model.stopLoss),
    takeProfit: model.takeProfit === null ? "" : String(model.takeProfit)
  };
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function hasResult(model: ModelResult) {
  return model.outcome !== null || model.resultR !== null;
}

async function compressImage(input: File): Promise<File> {
  if (!input.type.startsWith("image/")) throw new Error(`${input.name}: choose an image file.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input);
  } catch {
    throw new Error(`${input.name}: this image format could not be opened.`);
  }

  try {
    let scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    let quality = 0.88;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image compression is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (!blob) throw new Error("Could not prepare this image for upload.");
      if (blob.size <= MAX_IMAGE_BYTES) {
        const cleanName = input.name.replace(/\.[^.]+$/, "") || "chart";
        return new File([blob], `${cleanName}.webp`, { type: "image/webp", lastModified: Date.now() });
      }
      if (quality > 0.58) quality -= 0.1;
      else scale *= 0.78;
    }
    throw new Error(`${input.name}: the image is still over 5 MB after compression.`);
  } finally {
    bitmap.close();
  }
}

function uploadImage(modelId: string, file: File, onProgress: (value: number) => void): Promise<{ imagePath: string; url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/models/${encodeURIComponent(modelId)}/images`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading the image."));
    xhr.onload = () => {
      let payload: { imagePath?: string; url?: string; error?: string } = {};
      try { payload = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status < 200 || xhr.status >= 300 || !payload.url || !payload.imagePath) {
        reject(new Error(payload.error || "Image upload failed."));
        return;
      }
      resolve({ imagePath: payload.imagePath, url: payload.url });
    };
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

function summarize(models: ModelResult[]) {
  const results = models.filter(hasResult);
  const outcomes = results.filter((model) => model.outcome !== null);
  const wins = outcomes.filter((model) => model.outcome === "win").length;
  const losses = outcomes.filter((model) => model.outcome === "loss").length;
  const breakeven = outcomes.filter((model) => model.outcome === "breakeven").length;
  const rValues = results.map((model) => model.resultR).filter((value): value is number => value !== null);
  return {
    total: results.length,
    wins,
    losses,
    breakeven,
    winRate: outcomes.length ? (wins / outcomes.length) * 100 : null,
    averageR: rValues.length ? rValues.reduce((total, value) => total + value, 0) / rValues.length : null,
    totalR: rValues.length ? rValues.reduce((total, value) => total + value, 0) : null
  };
}

function signedNumber(value: number | null, suffix = "") {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
}

export default function ModelView({ onShowToast }: Props) {
  const [models, setModels] = useState<ModelResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ModelTab>("backtest");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeframeFilter, setTimeframeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selected, setSelected] = useState<ModelResult | null>(null);
  const [zoomUrl, setZoomUrl] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [formError, setFormError] = useState("");

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/models", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load saved models.");
      setModels(data.models || []);
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : "Could not load saved models.");
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => { void loadModels(); }, [loadModels]);

  const filteredModels = useMemo(() => models
    .filter((model) => tab === "compare" || model.type === tab)
    .filter((model) => categoryFilter === "all" || model.category === categoryFilter)
    .filter((model) => timeframeFilter === "all" || model.timeframes.includes(timeframeFilter))
    .filter((model) => !dateFrom || model.modelDate >= dateFrom)
    .filter((model) => !dateTo || model.modelDate <= dateTo)
    .filter((model) => {
      const text = `${model.instrument} ${model.title}`.toLowerCase();
      return !query.trim() || text.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => sortOrder === "newest"
      ? b.modelDate.localeCompare(a.modelDate) || b.createdAt.localeCompare(a.createdAt)
      : a.modelDate.localeCompare(b.modelDate) || a.createdAt.localeCompare(b.createdAt)),
  [models, tab, categoryFilter, timeframeFilter, dateFrom, dateTo, query, sortOrder]);

  const backtestStats = useMemo(() => summarize(filteredModels.filter((model) => model.type === "backtest")), [filteredModels]);
  const forwardStats = useMemo(() => summarize(filteredModels.filter((model) => model.type === "forward")), [filteredModels]);
  const currentStats = tab === "forward" ? forwardStats : backtestStats;

  const openCreate = () => {
    setDraft(emptyDraft(tab === "forward" ? "forward" : "backtest"));
    setEditingId(null);
    setPendingImages([]);
    setFormError("");
    setFormOpen(true);
    setSelected(null);
  };

  const openEdit = (model: ModelResult) => {
    setDraft(draftFromModel(model));
    setEditingId(model.id);
    setPendingImages([]);
    setFormError("");
    setSelected(model);
  };

  const addImages = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const invalid = incoming.find((file) => !file.type.startsWith("image/"));
    if (invalid) {
      setFormError(`${invalid.name}: only image files are accepted.`);
      return;
    }
    setFormError("");
    setPendingImages((current) => [...current, ...incoming]);
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const images = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (images.length) {
      event.preventDefault();
      addImages(images);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!draft.title.trim()) {
      setFormError("A title is required.");
      return;
    }
    const existing = editingId ? models.find((model) => model.id === editingId) : null;
    if (!editingId && !existing && pendingImages.length === 0) {
      setFormError("Add at least one chart image before saving this model.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...draft,
        title: draft.title.trim(),
        instrument: draft.instrument.trim(),
        resultR: draft.resultR,
        entry: draft.entry,
        stopLoss: draft.stopLoss,
        takeProfit: draft.takeProfit
      };
      let modelId = editingId;
      const response = await fetch("/api/models", {
        method: modelId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelId ? { ...payload, id: modelId } : payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this model.");
      const savedId = String(data.model.id);
      modelId = savedId;
      setEditingId(savedId);

      const failed: File[] = [];
      const uploadErrors: string[] = [];
      for (let index = 0; index < pendingImages.length; index += 1) {
        const file = pendingImages[index];
        try {
          setUploadProgress(`Preparing image ${index + 1} of ${pendingImages.length}…`);
          const prepared = await compressImage(file);
          setUploadProgress(`Uploading image ${index + 1} of ${pendingImages.length}: 0%`);
          await uploadImage(savedId, prepared, (progress) => {
            setUploadProgress(`Uploading image ${index + 1} of ${pendingImages.length}: ${progress}%`);
          });
        } catch (error) {
          failed.push(file);
          uploadErrors.push(error instanceof Error ? error.message : `${file.name}: image upload failed.`);
        }
      }
      setUploadProgress("");
      setPendingImages(failed);
      await loadModels();
      const refreshed = await fetch("/api/models", { cache: "no-store" }).then((result) => result.json());
      const saved = (refreshed.models as ModelResult[] | undefined)?.find((model) => model.id === modelId) || null;
      if (saved) setSelected(saved);
      if (failed.length) {
        setFormError(`${uploadErrors.join(" ")} Retry the remaining image${failed.length === 1 ? "" : "s"} when ready.`);
        return;
      }
      setFormOpen(false);
      setEditingId(null);
      onShowToast(editingId ? "Model updated." : "Model saved.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save this model.");
    } finally {
      setSubmitting(false);
      setUploadProgress("");
    }
  };

  const deleteModel = async (model: ModelResult) => {
    if (!window.confirm(`Delete “${model.title}” and its chart images?`)) return;
    try {
      const response = await fetch(`/api/models?id=${encodeURIComponent(model.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete model.");
      setSelected(null);
      await loadModels();
      onShowToast("Model deleted.");
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : "Could not delete model.");
    }
  };

  const removeImage = async (model: ModelResult, imageUrl: string) => {
    const index = model.imageUrls.indexOf(imageUrl);
    const imagePath = model.imagePaths[index];
    if (!imagePath) return;
    const filename = imagePath.split("/").pop();
    try {
      const response = await fetch(`/api/models/${encodeURIComponent(model.id)}/images?name=${encodeURIComponent(filename || "")}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove chart image.");
      await loadModels();
      const fresh = await fetch("/api/models", { cache: "no-store" }).then((result) => result.json());
      setSelected((fresh.models as ModelResult[]).find((item) => item.id === model.id) || null);
      onShowToast("Chart image removed.");
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : "Could not remove chart image.");
    }
  };

  const changeDraft = (key: keyof Draft, value: string | string[]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const statsPanel = (label: string, stats: ReturnType<typeof summarize>) => (
    <div className="model-stats-block">
      <h3>{label}</h3>
      <div className="model-stats-grid">
        <div className="model-stat"><span>Scored models</span><strong>{stats.total}</strong></div>
        <div className="model-stat"><span>Win rate</span><strong>{stats.winRate === null ? "—" : `${stats.winRate.toFixed(1)}%`}</strong><small>{stats.wins}W · {stats.losses}L · {stats.breakeven}BE</small></div>
        <div className="model-stat"><span>Average result</span><strong>{signedNumber(stats.averageR, "R")}</strong></div>
        <div className="model-stat"><span>Total result</span><strong>{signedNumber(stats.totalR, "R")}</strong></div>
      </div>
    </div>
  );

  return (
    <section className="models-view">
      <div className="panel-title model-heading">
        <div>
          <h2>My Model</h2>
          <p>Save chart analysis, backtests and forward tests in one workspace.</p>
        </div>
        <button type="button" className="primary" onClick={openCreate}>＋ Add model</button>
      </div>

      <div className="model-tabs" role="tablist" aria-label="My Model views">
        <button type="button" role="tab" aria-selected={tab === "backtest"} className={tab === "backtest" ? "is-active" : ""} onClick={() => setTab("backtest")}>Backtest</button>
        <button type="button" role="tab" aria-selected={tab === "forward"} className={tab === "forward" ? "is-active" : ""} onClick={() => setTab("forward")}>Forward Test</button>
        <button type="button" role="tab" aria-selected={tab === "compare"} className={tab === "compare" ? "is-active" : ""} onClick={() => setTab("compare")}>Compare</button>
      </div>

      <div className="model-filters panel">
        <label className="model-search">Search instrument
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search XAUUSD, title…" />
        </label>
        <label>Category
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((category) => <option value={category} key={category}>{category}</option>)}
          </select>
        </label>
        <label>Timeframe
          <select value={timeframeFilter} onChange={(event) => setTimeframeFilter(event.target.value)}>
            <option value="all">All timeframes</option>
            {TIMEFRAMES.map((frame) => <option value={frame} key={frame}>{frame}</option>)}
          </select>
        </label>
        <label>From
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label>To
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <label>Sort
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {tab === "compare" ? (
        <div className="model-compare panel">
          <div className="panel-title"><h2>Backtest vs Forward Test</h2><p>Compare saved result data for the current filters.</p></div>
          <div className="model-compare-grid">
            {statsPanel("Backtest", backtestStats)}
            {statsPanel("Forward Test", forwardStats)}
          </div>
          {(backtestStats.total === 0 && forwardStats.total === 0) && <p className="model-muted">Saved models without outcome or R values are excluded from the comparison.</p>}
        </div>
      ) : (
        <>
          {statsPanel(tab === "backtest" ? "Backtest statistics" : "Forward Test statistics", currentStats)}
          {loading ? (
            <div className="model-grid" aria-label="Loading models">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="model-skeleton" />)}
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="model-empty panel">
              <div className="model-empty-mark">＋</div>
              <h3>{models.length ? "No models match these filters" : "Start your model library"}</h3>
              <p>{models.length ? "Try a different instrument, category, timeframe or date range." : "Save a chart and its context to review your analysis later."}</p>
              {!models.length && <button type="button" className="primary" onClick={openCreate}>Add model</button>}
            </div>
          ) : (
            <div className="model-grid">
              {filteredModels.map((model) => (
                <button key={model.id} type="button" className="model-card" onClick={() => setSelected(model)} aria-label={`Open ${model.title}`}>
                  {model.imageUrls[0] ? <img className="model-card-image" src={model.imageUrls[0]} alt={`${model.instrument || model.title} chart`} /> : <div className="model-card-image model-image-placeholder"><span>Chart image</span></div>}
                  <span className="model-card-content">
                    <span className="model-card-meta"><span className="model-category">{model.category}</span><span className="model-instrument">{model.instrument || "—"} · {model.timeframes.length ? model.timeframes.join(", ") : "No timeframe"}</span></span>
                    <strong className="model-card-title">{model.title}</strong>
                    {model.subtitle && <span className="model-card-subtitle">{model.subtitle}</span>}
                    <span className="model-card-date">{formatDate(model.modelDate)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selected && !formOpen && !editingId && (
        <div className="model-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <article className="model-detail-modal" role="dialog" aria-modal="true" aria-label={selected.title}>
            <div className="model-detail-actions">
              <button type="button" className="ghost compact" onClick={() => setSelected(null)}>Close</button>
              <div><button type="button" className="ghost compact" onClick={() => openEdit(selected)}>Edit</button><button type="button" className="ghost danger compact" onClick={() => void deleteModel(selected)}>Delete</button></div>
            </div>
            <div className="model-detail-header">
              <span className="model-category">{selected.category}</span>
              <p className="model-instrument">{selected.instrument || "—"} · {selected.timeframes.join(", ") || "No timeframe"}</p>
              <h2>{selected.title}</h2>
              {selected.subtitle && <p className="model-card-subtitle">{selected.subtitle}</p>}
              <time>{formatDate(selected.modelDate)}</time>
            </div>
            {selected.imageUrls.length > 0 ? (
              <div className="model-gallery">
                {selected.imageUrls.map((url, index) => (
                  url ? <button type="button" className="model-gallery-image" key={`${selected.imagePaths[index]}-${index}`} onClick={() => setZoomUrl(url)} aria-label={`Zoom chart image ${index + 1}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt={`${selected.instrument || selected.title} chart ${index + 1}`} />
                    <span>{index === 0 ? "Thumbnail" : `Chart ${index + 1}`} · Click to zoom</span>
                  </button> : <div className="model-gallery-image model-image-placeholder" key={`${selected.imagePaths[index]}-${index}`}>Image unavailable</div>
                ))}
              </div>
            ) : <div className="model-image-placeholder model-detail-placeholder">No chart image attached</div>}
            {selected.notes && <section className="model-detail-section"><h3>Notes</h3><p>{selected.notes}</p></section>}
            <section className="model-detail-section"><h3>Result</h3>
              {hasResult(selected) ? <div className="model-result-grid">
                {selected.outcome && <div><span>Outcome</span><strong className={`model-outcome ${selected.outcome}`}>{selected.outcome}</strong></div>}
                {selected.resultR !== null && <div><span>Result</span><strong>{signedNumber(selected.resultR, "R")}</strong></div>}
                {selected.entry !== null && <div><span>Entry</span><strong>{selected.entry}</strong></div>}
                {selected.stopLoss !== null && <div><span>Stop loss</span><strong>{selected.stopLoss}</strong></div>}
                {selected.takeProfit !== null && <div><span>Take profit</span><strong>{selected.takeProfit}</strong></div>}
              </div> : <p className="model-muted">No result fields recorded. This model is excluded from stats.</p>}
            </section>
            <div className="model-detail-footer"><span>{selected.type === "backtest" ? "Backtest" : "Forward Test"}</span>{selected.imageUrls.length > 0 && <button className="ghost compact" type="button" onClick={() => void removeImage(selected, selected.imageUrls[selected.imageUrls.length - 1])}>Remove last chart image</button>}</div>
          </article>
        </div>
      )}

      {(formOpen || (selected && editingId)) && (
        <div className="model-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) { setFormOpen(false); setEditingId(null); } }}>
          <form className="model-form-modal" onSubmit={handleSave} onPaste={handlePaste}>
            <div className="model-form-heading"><div><h2>{editingId ? "Edit model" : "Add model"}</h2><p>Record the chart, context and optional result data.</p></div><button type="button" className="ghost compact" disabled={submitting} onClick={() => { setFormOpen(false); setEditingId(null); }}>Close</button></div>
            <div className="model-form-grid">
              <label>Category<select value={draft.category} onChange={(event) => changeDraft("category", event.target.value)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Model tab<select value={draft.type} onChange={(event) => changeDraft("type", event.target.value)}><option value="backtest">Backtest</option><option value="forward">Forward Test</option></select></label>
              <label>Instrument<input value={draft.instrument} onChange={(event) => changeDraft("instrument", event.target.value)} placeholder="XAUUSD" maxLength={32} /></label>
              <label>Date<input type="date" value={draft.modelDate} onChange={(event) => changeDraft("modelDate", event.target.value)} required /></label>
              <label className="model-form-wide">Title<input value={draft.title} onChange={(event) => changeDraft("title", event.target.value)} placeholder="XAUUSD ANALYSIS - 13 NOVEMBER 2026" maxLength={160} required /></label>
              <label className="model-form-wide">Subtitle <span className="model-muted">(optional)</span><input value={draft.subtitle} onChange={(event) => changeDraft("subtitle", event.target.value)} placeholder="XAUUSD LIQUIDITY MARKUP - QPT" maxLength={240} /></label>
              <fieldset className="model-timeframe-fieldset model-form-wide"><legend>Timeframes</legend><div className="model-timeframe-list">{TIMEFRAMES.map((frame) => <label key={frame} className={draft.timeframes.includes(frame) ? "is-selected" : ""}><input type="checkbox" checked={draft.timeframes.includes(frame)} onChange={(event) => changeDraft("timeframes", event.target.checked ? [...draft.timeframes, frame] : draft.timeframes.filter((item) => item !== frame))} />{frame}</label>)}</div></fieldset>
              <label className="model-form-wide">Notes / full description<textarea rows={4} value={draft.notes} onChange={(event) => changeDraft("notes", event.target.value)} placeholder="Reasoning, setup rules, execution notes…" maxLength={20000} /></label>
            </div>
            <details className="model-result-editor"><summary>Optional result fields for stats</summary><div className="model-form-grid">
              <label>Outcome<select value={draft.outcome} onChange={(event) => changeDraft("outcome", event.target.value)}><option value="">Not recorded</option><option value="win">Win</option><option value="loss">Loss</option><option value="breakeven">Breakeven</option></select></label>
              <label>Result in R<input type="number" step="any" value={draft.resultR} onChange={(event) => changeDraft("resultR", event.target.value)} placeholder="e.g. 2.5" /></label>
              <label>Entry<input type="number" step="any" value={draft.entry} onChange={(event) => changeDraft("entry", event.target.value)} /></label>
              <label>Stop loss<input type="number" step="any" value={draft.stopLoss} onChange={(event) => changeDraft("stopLoss", event.target.value)} /></label>
              <label>Take profit<input type="number" step="any" value={draft.takeProfit} onChange={(event) => changeDraft("takeProfit", event.target.value)} /></label>
            </div></details>
            {editingId && selected?.imageUrls.length ? <div className="model-existing-images"><strong>Current chart gallery</strong><div className="model-existing-image-list">{selected.imageUrls.map((url, index) => <button type="button" key={url} onClick={() => setZoomUrl(url)}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt={`Current chart ${index + 1}`} /><span>Chart {index + 1}</span></button>)}</div></div> : null}
            <div className="model-upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addImages(event.dataTransfer.files); }}>
              <strong>Chart images</strong><p>Choose, drag in or paste chart images. Each upload is compressed to 5 MB or less.</p>
              <label className="ghost compact model-file-button">Select images<input type="file" accept="image/*" multiple onChange={(event) => { if (event.target.files) addImages(event.target.files); event.currentTarget.value = ""; }} /></label>
              {pendingImages.length > 0 && <ul className="model-pending-list">{pendingImages.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" className="ghost compact danger" disabled={submitting} onClick={() => setPendingImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}>Remove</button></li>)}</ul>}
            </div>
            {uploadProgress && <div className="model-upload-progress" role="status">{uploadProgress}</div>}
            {formError && <p className="model-form-error" role="alert">{formError}</p>}
            <div className="model-form-footer"><span className="model-muted">At least one chart image is required.</span><button type="submit" className="primary" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save changes" : "Save model"}</button></div>
          </form>
        </div>
      )}

      {zoomUrl && <div className="model-zoom-backdrop" role="presentation" onClick={() => setZoomUrl("")}><button type="button" className="ghost compact model-zoom-close" onClick={() => setZoomUrl("")}>Close</button>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={zoomUrl} alt="Full size chart" onClick={(event) => event.stopPropagation()} /></div>}
    </section>
  );
}
