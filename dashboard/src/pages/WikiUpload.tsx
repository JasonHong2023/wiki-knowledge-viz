import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Globe, FileText, Loader2, CheckCircle2, BarChart3, List, AlertTriangle, XCircle, SkipForward } from "lucide-react";
import { wiki } from "../api";

type TabId = "import-url" | "upload-file" | "batch-import";

interface UploadResponse {
  path: string;
  message: string;
  data: { languages: string[]; tags: string[]; category?: string; confidence?: string };
}

interface AnalysisProgress {
  task_id: string;
  filename: string;
  status: string;
  progress: number;
  steps: Record<string, { status: string; progress: number; message: string }>;
  result: UploadResponse | null;
  error: string | null;
}

const DOC_TYPES = ["auto", "entity", "concept", "comparison", "query"] as const;
const UPLOAD_TYPES = ["auto", "entity", "concept", "comparison", "query"] as const;
const TYPE_LABEL: Record<string, string> = { auto: "自動偵測" };

const STEP_LABELS: Record<string, string> = {
  content_extraction: "Content Extraction",
  language_detection: "Language Detection",
  tag_analysis: "Tag Analysis",
  relation_analysis: "Relation Analysis",
  registry_update: "Tag Registry Update",
  complete: "Complete",
};

function stepLabel(key: string): string {
  return STEP_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-current/10">
      <div
        className="h-full rounded-full bg-midground transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface ConflictInfo {
  existing_path: string;
  message: string;
  pendingForce: "url" | "file";
}

// ── Poll a background task until done ──────────────────────────────────
async function pollUntilDone(taskId: string): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const iv = setInterval(async () => {
      try {
        const data: AnalysisProgress = await wiki.analysisProgress(taskId);
        if (data.status === "complete" && data.result) { clearInterval(iv); resolve(data.result); }
        else if (data.status === "failed") { clearInterval(iv); reject(new Error(data.error ?? "Analysis failed")); }
      } catch (e) { clearInterval(iv); reject(e); }
    }, 2000);
  });
}

// ── Import a single URL, returns outcome ───────────────────────────────
type ImportOutcome =
  | { kind: "success"; path: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; existingPath: string; message: string };

async function importOneUrl(url: string, docType: string, force: boolean): Promise<ImportOutcome> {
  try {
    const res = await wiki.importUrl({ url, type: docType, force });
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      return { kind: "conflict", existingPath: body.detail?.existing_path ?? "", message: body.detail?.message ?? "已存在" };
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { kind: "error", message: body?.detail ?? body?.message ?? `HTTP ${res.status}` };
    }
    const body = await res.json();
    if (body.task_id) {
      const result = await pollUntilDone(body.task_id);
      return { kind: "success", path: result.path };
    }
    return { kind: "success", path: body.path ?? "" };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Batch Import Tab
// ═══════════════════════════════════════════════════════════════════════
type RowStatus = "pending" | "processing" | "success" | "error" | "conflict" | "skipped";

interface BatchRow {
  id: number;
  url: string;
  status: RowStatus;
  message: string;
  existingPath?: string;
  path?: string;
}

function BatchImport({ docType, onRefresh }: { docType: string; onRefresh: () => void }) {
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef(false);

  const updateRow = useCallback((id: number, patch: Partial<BatchRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const parseUrls = () =>
    rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && (l.startsWith("http://") || l.startsWith("https://")));

  const handleStart = async () => {
    const urls = parseUrls();
    if (urls.length === 0) return;
    const initial: BatchRow[] = urls.map((url, i) => ({
      id: i,
      url,
      status: "pending",
      message: "",
    }));
    setRows(initial);
    setRunning(true);
    abortRef.current = false;

    for (let i = 0; i < initial.length; i++) {
      if (abortRef.current) {
        // mark remaining as skipped
        setRows((prev) =>
          prev.map((r) => (r.status === "pending" ? { ...r, status: "skipped", message: "已中止" } : r)),
        );
        break;
      }
      const row = initial[i];
      updateRow(row.id, { status: "processing", message: "" });
      const outcome = await importOneUrl(row.url, docType, false);
      if (outcome.kind === "success") {
        updateRow(row.id, { status: "success", message: outcome.path, path: outcome.path });
        onRefresh();
      } else if (outcome.kind === "conflict") {
        updateRow(row.id, { status: "conflict", message: outcome.message, existingPath: outcome.existingPath });
        // pause and wait for user decision — handled by overwrite/skip buttons
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            setRows((prev) => {
              const r = prev.find((x) => x.id === row.id);
              if (r && r.status !== "conflict") { clearInterval(check); resolve(); }
              return prev;
            });
          }, 300);
        });
      } else {
        updateRow(row.id, { status: "error", message: outcome.message });
      }
    }
    setRunning(false);
  };

  const handleStop = () => { abortRef.current = true; };

  const handleReset = () => {
    setRows([]);
    setRunning(false);
    abortRef.current = false;
  };

  const handleOverwrite = async (id: number, url: string) => {
    updateRow(id, { status: "processing", message: "覆蓋中…" });
    const outcome = await importOneUrl(url, docType, true);
    if (outcome.kind === "success") {
      updateRow(id, { status: "success", message: outcome.path, path: outcome.path });
      onRefresh();
    } else {
      updateRow(id, { status: "error", message: outcome.message });
    }
  };

  const handleSkip = (id: number) => {
    updateRow(id, { status: "skipped", message: "已跳過" });
  };

  const totalCount = rows.length;
  const doneCount = rows.filter((r) => r.status === "success").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const conflictCount = rows.filter((r) => r.status === "conflict").length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const processingRow = rows.find((r) => r.status === "processing");

  const statusIcon = (s: RowStatus) => {
    if (s === "processing") return <Loader2 className="h-3.5 w-3.5 animate-spin text-midground shrink-0" />;
    if (s === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />;
    if (s === "error") return <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />;
    if (s === "conflict") return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
    if (s === "skipped") return <SkipForward className="h-3.5 w-3.5 text-text-tertiary shrink-0" />;
    return <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current/20 inline-block" />;
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              URL 清單（每行一個）
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder={"https://www.youtube.com/watch?v=...\nhttps://github.com/owner/repo\nhttps://example.com/article"}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent font-mono"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              偵測到 {parseUrls().length} 個有效網址
            </p>
          </div>
          <button
            type="button"
            disabled={parseUrls().length === 0}
            onClick={() => void handleStart()}
            style={{ padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 500, border: "none", cursor: parseUrls().length === 0 ? "not-allowed" : "pointer", background: "rgba(99,102,241,0.8)", color: "#fff", opacity: parseUrls().length === 0 ? 0.4 : 1 }}
          >
            開始批量匯入
          </button>
        </>
      ) : (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 rounded-lg border border-current/10 bg-current/[0.03] px-4 py-2 text-xs">
            <span className="text-text-secondary">共 {totalCount} 筆</span>
            {doneCount > 0 && <span className="text-green-400">✓ {doneCount} 成功</span>}
            {errorCount > 0 && <span className="text-red-400">✗ {errorCount} 失敗</span>}
            {conflictCount > 0 && <span className="text-yellow-400">⚠ {conflictCount} 重複待確認</span>}
            {pendingCount > 0 && <span className="text-text-tertiary">{pendingCount} 待處理</span>}
            {processingRow && (
              <span className="ml-auto text-text-tertiary truncate max-w-xs">
                處理中…
              </span>
            )}
            <div className="ml-auto flex gap-2">
              {running && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="rounded px-2 py-1 text-xs border border-border text-text-secondary hover:text-red-400"
                >
                  暫停
                </button>
              )}
              {!running && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded px-2 py-1 text-xs border border-border text-text-secondary hover:text-text-primary"
                >
                  重置
                </button>
              )}
            </div>
          </div>

          {/* Overall progress bar */}
          {running && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-current/10">
              <div
                className="h-full rounded-full bg-midground transition-all duration-500"
                style={{ width: `${totalCount > 0 ? Math.round(((doneCount + errorCount + rows.filter(r => r.status === "skipped").length) / totalCount) * 100) : 0}%` }}
              />
            </div>
          )}

          {/* Row list */}
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                  row.status === "conflict"
                    ? "border-yellow-400/30 bg-yellow-400/5"
                    : row.status === "error"
                      ? "border-red-400/20 bg-red-400/5"
                      : row.status === "success"
                        ? "border-green-400/20 bg-green-400/5"
                        : "border-current/10 bg-current/[0.02]"
                }`}
              >
                <span className="mt-0.5">{statusIcon(row.status)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-text-secondary font-mono">{row.url}</p>
                  {row.status === "success" && row.path && (
                    <p className="mt-0.5 text-green-400">{row.path}</p>
                  )}
                  {row.status === "error" && (
                    <p className="mt-0.5 text-red-400">{row.message}</p>
                  )}
                  {row.status === "conflict" && (
                    <div className="mt-1">
                      <p className="text-yellow-400">{row.message}</p>
                      <p className="text-text-tertiary">現有：{row.existingPath}</p>
                      <div className="mt-1.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleOverwrite(row.id, row.url)}
                          style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", background: "rgba(251,191,36,0.8)", color: "#1a1a1a" }}
                        >
                          覆蓋
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSkip(row.id)}
                          style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, border: "1px solid rgba(128,128,128,0.3)", background: "transparent", cursor: "pointer", color: "var(--color-text-secondary,#aaa)" }}
                        >
                          跳過
                        </button>
                      </div>
                    </div>
                  )}
                  {row.status === "processing" && (
                    <p className="mt-0.5 text-text-tertiary animate-pulse">匯入中…</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main WikiUpload page
// ═══════════════════════════════════════════════════════════════════════
export default function WikiUpload({ onRefresh }: { onRefresh: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("import-url");
  const [url, setUrl] = useState("");
  const [docType, setDocType] = useState<string>("auto");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [preflightPct, setPreflightPct] = useState(0);
  const preflightRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPreflight = useCallback(() => {
    if (preflightRef.current !== null) { clearInterval(preflightRef.current); preflightRef.current = null; }
    setPreflightPct(0);
  }, []);

  const startPreflight = useCallback(() => {
    clearPreflight();
    setPreflightPct(3);
    preflightRef.current = setInterval(() => setPreflightPct((p) => (p < 28 ? p + 1 : p)), 800);
  }, [clearPreflight]);

  const clearPoll = useCallback(() => {
    if (pollRef.current !== null) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((tid: string) => {
    clearPoll(); clearPreflight(); setTaskId(tid); setProgress(null);
    pollRef.current = setInterval(async () => {
      try {
        const data: AnalysisProgress = await wiki.analysisProgress(tid);
        setProgress(data);
        if (data.status === "complete" && data.result) {
          clearPoll(); setResult(data.result); setTaskId(null); setProgress(null); setLoading(false); onRefresh();
        } else if (data.status === "failed") {
          clearPoll(); setError(data.error ?? "Analysis failed"); setTaskId(null); setProgress(null); setLoading(false);
        }
      } catch { clearPoll(); setError("Progress check failed"); setLoading(false); }
    }, 2000);
  }, [clearPoll, clearPreflight, onRefresh]);

  useEffect(() => () => { clearPoll(); clearPreflight(); }, [clearPoll, clearPreflight]);

  const handleImportUrl = async (force = false) => {
    if (!url) return;
    setLoading(true); setError(null); setResult(null); setConflict(null); setTaskId(null); setProgress(null);
    clearPoll(); startPreflight();
    try {
      const res = await wiki.importUrl({ url, type: docType, force });
      if (res.status === 409) {
        clearPreflight();
        const err = await res.json().catch(() => ({}));
        setConflict({ ...err.detail, pendingForce: "url" });
        setLoading(false); return;
      }
      if (!res.ok) {
        clearPreflight();
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? `Import failed (${res.status})`);
      }
      const body = await res.json();
      if (body.task_id) { startPolling(body.task_id); }
      else { clearPreflight(); setResult(body); setLoading(false); onRefresh(); }
    } catch (e: unknown) {
      clearPreflight(); setError(e instanceof Error ? e.message : "Failed to import URL"); setLoading(false);
    }
  };

  const handleUploadFile = async (force = false) => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null); setConflict(null); setTaskId(null); setProgress(null);
    clearPoll(); startPreflight();
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await wiki.uploadFile(fd, docType, force);
      if (res.status === 409) {
        clearPreflight();
        const err = await res.json().catch(() => ({}));
        setConflict({ ...err.detail, pendingForce: "file" });
        setLoading(false); return;
      }
      if (!res.ok) {
        clearPreflight();
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? `Upload failed (${res.status})`);
      }
      const body = await res.json();
      if (body.task_id) { startPolling(body.task_id); }
      else { clearPreflight(); setResult(body); setLoading(false); onRefresh(); }
    } catch (e: unknown) {
      clearPreflight(); setError(e instanceof Error ? e.message : "Failed to upload file"); setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (activeTab === "import-url") void handleImportUrl(false);
    else void handleUploadFile(false);
  };

  const handleForceOverwrite = () => {
    if (!conflict) return;
    if (conflict.pendingForce === "url") void handleImportUrl(true);
    else void handleUploadFile(true);
  };

  const resetTab = () => { setError(null); setResult(null); setConflict(null); setTaskId(null); setProgress(null); clearPoll(); };

  const tabStyle = (tab: TabId): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, padding: "6px 14px",
    fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid",
    background: activeTab === tab ? "rgba(99,102,241,0.15)" : "transparent",
    color: activeTab === tab ? "#a5b4fc" : "var(--color-text-tertiary,#888)",
    borderColor: activeTab === tab ? "rgba(99,102,241,0.35)" : "rgba(128,128,128,0.2)",
    transition: "background 0.15s, color 0.15s",
  });

  const activeStep = progress?.steps
    ? Object.entries(progress.steps).find(([, v]) => v.status === "in_progress")
      ?? Object.entries(progress.steps).findLast(([, v]) => v.status === "complete")
      ?? Object.entries(progress.steps).find(([, v]) => v.status === "failed")
      ?? ["", { status: "", progress: 0, message: "" }]
    : null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Upload className="h-5 w-5 text-text-secondary" />
        <h1 className="text-xl font-bold text-text-primary">Wiki Upload</h1>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <button type="button" style={tabStyle("import-url")} onClick={() => { setActiveTab("import-url"); resetTab(); }}>
          <Globe style={{ width: 14, height: 14 }} />
          Import URL
        </button>
        <button type="button" style={tabStyle("upload-file")} onClick={() => { setActiveTab("upload-file"); resetTab(); }}>
          <FileText style={{ width: 14, height: 14 }} />
          Upload File
        </button>
        <button type="button" style={tabStyle("batch-import")} onClick={() => { setActiveTab("batch-import"); resetTab(); }}>
          <List style={{ width: 14, height: 14 }} />
          批量匯入
        </button>
      </div>

      {/* ── Batch import tab ─────────────────────────────────────────── */}
      {activeTab === "batch-import" && (
        <BatchImport docType={docType} onRefresh={onRefresh} />
      )}

      {/* ── Single URL / File tabs ────────────────────────────────────── */}
      {activeTab !== "batch-import" && (
        <div className="mb-6 space-y-4">
          {activeTab === "import-url" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/doc.md"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent"
              />
            </div>
          )}

          {activeTab === "upload-file" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                File (MD / PDF / PPT / Excel / Image)
              </label>
              <input
                type="file"
                accept=".md,.markdown,.txt,.epub,.pdf,.pptx,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
                style={{ fontSize: 13 }}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            >
              {(activeTab === "import-url" ? DOC_TYPES : UPLOAD_TYPES).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t] ?? (t.charAt(0).toUpperCase() + t.slice(1))}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={loading || (activeTab === "import-url" ? !url : !file)}
            onClick={handleSubmit}
            style={{ padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", background: "rgba(99,102,241,0.8)", color: "#fff", opacity: (loading || (activeTab === "import-url" ? !url : !file)) ? 0.4 : 1 }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {taskId ? "Analysing..." : activeTab === "import-url" ? "Importing..." : "Uploading..."}
              </span>
            ) : activeTab === "import-url" ? "Import" : "Upload"}
          </button>
        </div>
      )}

      {/* ── Progress (single mode) ───────────────────────────────────── */}
      {activeTab !== "batch-import" && progress && (
        <div className="mb-6 rounded-lg border border-current/10 bg-current/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-midground" />
            <span className="text-sm font-medium text-text-primary">Analysis Progress</span>
            <span className="ml-auto text-sm text-text-secondary">{progress.progress}%</span>
          </div>
          <ProgressBar value={progress.progress} />
          {activeStep && activeStep[0] && (
            <p className="text-xs text-text-secondary">
              {stepLabel(activeStep[0] as string)}{(activeStep[1] as { message: string })?.message ? ` — ${(activeStep[1] as { message: string }).message}` : ""}
            </p>
          )}
          <div className="mt-3 space-y-1">
            {Object.entries(progress.steps).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                  val.status === "complete" ? "bg-green-400"
                  : val.status === "in_progress" ? "bg-midground animate-pulse"
                  : val.status === "failed" ? "bg-red-400"
                  : "bg-current/20"
                }`} />
                <span className={val.status === "complete" ? "text-text-secondary" : val.status === "in_progress" ? "text-text-primary" : "text-text-tertiary"}>
                  {stepLabel(key)}
                </span>
                {val.progress > 0 && val.progress < 100 && <span className="text-text-tertiary">{val.progress}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab !== "batch-import" && loading && !progress && (
        <div className="mb-6 rounded-lg border border-current/10 bg-current/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-midground" />
            <span className="text-sm font-medium text-text-primary">Fetching content…</span>
            <span className="ml-auto text-sm text-text-secondary">{preflightPct}%</span>
          </div>
          <ProgressBar value={preflightPct} />
          <p className="text-xs text-text-secondary">Retrieving and preparing content for analysis</p>
        </div>
      )}

      {activeTab !== "batch-import" && conflict && (
        <div className="rounded-lg border border-yellow-400/40 bg-yellow-400/5 p-4">
          <p className="mb-3 text-sm text-yellow-400">{conflict.message}</p>
          <p className="mb-4 text-xs text-text-secondary">
            現有檔案：<code className="text-text-primary">{conflict.existing_path}</code>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleForceOverwrite} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: "rgba(251,191,36,0.8)", color: "#1a1a1a" }}>
              覆蓋並重新匯入
            </button>
            <button type="button" onClick={() => setConflict(null)} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, border: "1px solid rgba(128,128,128,0.3)", background: "transparent", cursor: "pointer", color: "var(--color-text-secondary,#aaa)" }}>
              取消
            </button>
          </div>
        </div>
      )}

      {activeTab !== "batch-import" && error && (
        <div className="rounded-lg border border-red-400/30 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {activeTab !== "batch-import" && result && (
        <div className="rounded-lg border border-green-400/30 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <p className="text-sm font-medium text-green-400">{result.message}</p>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Path: <code className="text-text-primary">{result.path}</code>
          </p>
          {result.data.languages.length > 0 && <p className="mt-1 text-sm text-text-secondary">Languages: {result.data.languages.join(", ")}</p>}
          {result.data.tags.length > 0 && <p className="mt-1 text-sm text-text-secondary">Tags: {result.data.tags.join(", ")}</p>}
          {result.data.category && <p className="mt-1 text-sm text-text-secondary">Category: {result.data.category}</p>}
          {result.data.confidence && <p className="mt-1 text-sm text-text-secondary">Confidence: {result.data.confidence}</p>}
        </div>
      )}
    </div>
  );
}
