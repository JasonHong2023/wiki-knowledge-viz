import { useEffect, useState } from "react";
import { X, Loader2, FileText, Trash2, Wand2, Check, Save } from "lucide-react";
import { wiki } from "../api";
import Markdown from "./Markdown";
import WikiFirePanel from "./WikiFirePanel";

interface RelationItem { target: string; type: string; reason?: string; }
interface WikiPageData {
  path: string;
  title: string;
  type: string;
  tags: string[];
  created: string | null;
  updated: string | null;
  confidence: string;
  frontmatter: Record<string, unknown>;
  content: string;
  inboundLinks: string[];
  outboundLinks: string[];
}

const REL_COLORS: Record<string, string> = {
  prerequisite: "#f97316", contains: "#60a5fa", applies_to: "#34d399", related: "rgba(128,128,128,0.55)",
};
const REL_LABELS: Record<string, string> = {
  prerequisite: "前置", contains: "包含", applies_to: "應用", related: "關聯",
};
const VALID_TYPES = ["prerequisite", "contains", "applies_to", "related"];

const MASTERY_LABELS: Record<number, string> = {
  0: "未接觸", 1: "認識", 2: "理解", 3: "應用", 4: "分析", 5: "精通",
};
const MASTERY_COLORS = ["#555", "#94a3b8", "#60a5fa", "#34d399", "#fbbf24", "#c084fc"];

const BLOOM_LEVELS_D = ["remember","understand","apply","analyze","evaluate","create"] as const;
const BLOOM_LABELS_D: Record<string,string> = {
  remember:"記憶", understand:"理解", apply:"應用", analyze:"分析", evaluate:"評估", create:"創作",
};
const BLOOM_COLORS_D: Record<string,string> = {
  remember:"#94a3b8", understand:"#60a5fa", apply:"#34d399",
  analyze:"#fbbf24", evaluate:"#f97316", create:"#c084fc",
};

interface WikiPageDetailProps {
  pagePath: string;
  onClose: () => void;
  onDelete?: (path: string) => void;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export default function WikiPageDetail({ pagePath, onClose, onDelete }: WikiPageDetailProps) {
  const [page, setPage] = useState<WikiPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relations, setRelations] = useState<RelationItem[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [suggestions, setSuggestions] = useState<(RelationItem & { accepted?: boolean })[]>([]);
  const [saving, setSaving] = useState(false);
  const [mastery, setMastery] = useState<number>(0);
  const [savingMastery, setSavingMastery] = useState(false);
  const [bloom, setBloom] = useState<string>("");
  const [savingBloom, setSavingBloom] = useState(false);
  const [classifyingBloom, setClassifyingBloom] = useState(false);
  const [bloomReason, setBloomReason] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(null);

    wiki.page(encodeURIComponent(pagePath))
      .then((data: WikiPageData) => {
        if (!cancelled) {
          setPage(data);
          setLoading(false);
          // 從 frontmatter 讀取 saved relations
          const fm = data.frontmatter as Record<string, unknown>;
          setMastery(typeof fm?.mastery === "number" ? fm.mastery : 0);
          setBloom(typeof fm?.bloom === "string" ? fm.bloom : "");
          setBloomReason("");
          const saved = fm?.relations;
          if (Array.isArray(saved)) {
            setRelations(saved.filter((r: unknown) => r && typeof r === "object" && (r as RelationItem).target));
          } else {
            setRelations([]);
          }
          setSuggestions([]);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load page");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [pagePath]);

  return (
    <div className="rounded-lg border border-current/10 bg-background-base/50 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-text-secondary" />
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {page?.title ?? pagePath}
          </h3>
          {page?.type && (
            <span className="shrink-0 rounded bg-current/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary">
              {page.type}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onDelete && page && (
            <button
              onClick={() => onDelete(pagePath)}
              className="shrink-0 rounded p-1 text-red-400 hover:bg-red-400/10"
              title={`Delete "${page?.title || pagePath}"`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="shrink-0 text-text-tertiary hover:text-text-primary"
            aria-label="Close detail panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {!loading && !error && page && (
        <div className="space-y-4">
          {/* Timestamps */}
          <div className="flex gap-4 text-xs text-text-tertiary">
            <span>Created: <strong>{fmtDate(page.created)}</strong></span>
            <span>Updated: <strong>{fmtDate(page.updated)}</strong></span>
          </div>

          {/* Tags */}
          {page.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {page.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-current/10 px-1.5 py-0.5 text-[10px] text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Frontmatter */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-text-secondary">Frontmatter</h4>
            <div className="rounded border border-current/10 p-3 font-mono text-xs">
              {Object.entries(page.frontmatter).map(([key, val]) => (
                <div key={key} className="flex gap-2">
                  <span className="shrink-0 text-text-tertiary">{key}:</span>
                  <span className="truncate text-text-primary">
                    {Array.isArray(val) ? val.join(", ") : String(val ?? "")}
                  </span>
                </div>
              ))}
              {Object.keys(page.frontmatter).length === 0 && (
                <span className="italic text-text-tertiary">No frontmatter</span>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-4 text-xs text-text-secondary">
            {page.inboundLinks.length > 0 && (
              <span>Inbound: {page.inboundLinks.join(", ")}</span>
            )}
            {page.outboundLinks.length > 0 && (
              <span>Outbound: {page.outboundLinks.join(", ")}</span>
            )}
          </div>

          {/* Content */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-text-secondary">
              Markdown Content
            </h4>
            <div className="max-h-96 overflow-auto rounded border border-current/10 p-3 text-xs leading-relaxed text-text-primary">
              {page.content
                ? <Markdown content={page.content} />
                : <span className="italic text-text-tertiary">(empty)</span>}
            </div>
          </div>

          {/* Mastery Level */}
          <div>
            <h4 style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary,#aaa)" }}>熟練度</h4>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {[0,1,2,3,4,5].map(level => {
                const active = mastery >= level && level > 0;
                const isCurrent = mastery === level;
                return (
                  <button
                    key={level}
                    disabled={savingMastery}
                    onClick={async () => {
                      const next = mastery === level ? 0 : level;
                      setSavingMastery(true);
                      setMastery(next);
                      try { await wiki.setMastery(pagePath, next); } catch (e) { console.error(e); }
                      setSavingMastery(false);
                    }}
                    title={`${level}: ${MASTERY_LABELS[level]}`}
                    style={{
                      width: level === 0 ? 16 : 20, height: level === 0 ? 16 : 20, borderRadius: "50%", padding: 0,
                      border: `2px solid ${active ? MASTERY_COLORS[level] : "rgba(128,128,128,0.2)"}`,
                      background: active ? `${MASTERY_COLORS[level]}22` : "transparent",
                      cursor: savingMastery ? "wait" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: active ? MASTERY_COLORS[level] : "rgba(128,128,128,0.35)",
                      outline: isCurrent ? `2px solid ${MASTERY_COLORS[level]}` : "none", outlineOffset: 2,
                    }}
                  >
                    {level}
                  </button>
                );
              })}
              <span style={{ fontSize: 11, color: MASTERY_COLORS[mastery], marginLeft: 4, fontWeight: 500 }}>
                {MASTERY_LABELS[mastery]}
              </span>
            </div>
          </div>

          {/* Bloom Level */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h4 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary,#aaa)" }}>布魯姆層次</h4>
              <button
                disabled={classifyingBloom}
                onClick={async () => {
                  setClassifyingBloom(true);
                  try {
                    const res = await wiki.classifyBloom(pagePath);
                    if (res.bloom) {
                      setBloom(res.bloom);
                      setBloomReason(res.reason || "");
                      await wiki.setBloom(pagePath, res.bloom);
                    }
                  } catch (e) { console.error(e); }
                  setClassifyingBloom(false);
                }}
                style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(165,180,252,0.3)", background: "rgba(99,102,241,0.08)", color: "#a5b4fc", cursor: classifyingBloom ? "wait" : "pointer" }}
              >
                {classifyingBloom ? <Loader2 style={{ width: 10, height: 10 }} /> : <Wand2 style={{ width: 10, height: 10 }} />} AI 判斷
              </button>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {BLOOM_LEVELS_D.map(b => (
                <button key={b}
                  disabled={savingBloom}
                  onClick={async () => {
                    const next = bloom === b ? "" : b;
                    setSavingBloom(true); setBloom(next); setBloomReason("");
                    try { await wiki.setBloom(pagePath, next); } catch (e) { console.error(e); }
                    setSavingBloom(false);
                  }}
                  style={{ fontSize: 10, padding: "2px 8px", borderRadius: 9999, cursor: savingBloom ? "wait" : "pointer",
                    border: `1px solid ${bloom === b ? BLOOM_COLORS_D[b] : "rgba(128,128,128,0.2)"}`,
                    background: bloom === b ? `${BLOOM_COLORS_D[b]}22` : "transparent",
                    color: bloom === b ? BLOOM_COLORS_D[b] : "var(--color-text-secondary,#aaa)",
                    fontWeight: bloom === b ? 600 : 400,
                  }}
                >{BLOOM_LABELS_D[b]}</button>
              ))}
            </div>
            {bloomReason && <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--color-text-tertiary,#888)", fontStyle: "italic" }}>{bloomReason}</p>}
          </div>

          {/* Semantic Relations */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h4 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary,#aaa)" }}>語義關係</h4>
              <div style={{ display: "flex", gap: 4 }}>
                {suggestions.length > 0 && (
                  <button
                    disabled={saving}
                    onClick={async () => {
                      const accepted = suggestions.filter(s => s.accepted !== false);
                      setSaving(true);
                      try {
                        await wiki.saveRelations(pagePath, accepted.map(s => ({ target: s.target, type: s.type })));
                        setRelations(accepted.map(s => ({ target: s.target, type: s.type, reason: s.reason })));
                        setSuggestions([]);
                      } catch (e) { console.error(e); }
                      setSaving(false);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.08)", color: "#6ee7b7", cursor: saving ? "wait" : "pointer" }}
                  >
                    <Save style={{ width: 10, height: 10 }} /> 儲存
                  </button>
                )}
                <button
                  disabled={classifying}
                  onClick={async () => {
                    setClassifying(true);
                    try {
                      const res = await wiki.classifyRelations(pagePath);
                      if (Array.isArray(res.suggestions) && res.suggestions.length) {
                        setSuggestions(res.suggestions.map((s: RelationItem) => ({ ...s, accepted: true })));
                      } else {
                        setSuggestions([]);
                      }
                    } catch (e) { console.error(e); }
                    setClassifying(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(165,180,252,0.3)", background: "rgba(99,102,241,0.08)", color: "#a5b4fc", cursor: classifying ? "wait" : "pointer" }}
                >
                  {classifying ? <Loader2 style={{ width: 10, height: 10 }} /> : <Wand2 style={{ width: 10, height: 10 }} />} AI 分類
                </button>
              </div>
            </div>

            {/* Suggestions (pending) */}
            {suggestions.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary,#888)", marginBottom: 4 }}>AI 建議（點擊可切換接受）</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {suggestions.map((s, idx) => (
                    <div key={idx}
                      onClick={() => setSuggestions(prev => prev.map((x, i) => i === idx ? { ...x, accepted: x.accepted === false } : x))}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 6px", borderRadius: 4, cursor: "pointer", background: s.accepted === false ? "rgba(128,128,128,0.06)" : "rgba(99,102,241,0.06)", border: `1px solid ${s.accepted === false ? "rgba(128,128,128,0.12)" : "rgba(99,102,241,0.2)"}`, opacity: s.accepted === false ? 0.45 : 1 }}
                    >
                      <Check style={{ width: 9, height: 9, color: s.accepted === false ? "#888" : "#a5b4fc", flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: REL_COLORS[s.type] ?? "#888", fontWeight: 600, flexShrink: 0 }}>{REL_LABELS[s.type] ?? s.type}</span>
                      <span style={{ fontSize: 10, color: "var(--color-text-secondary,#aaa)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.target}>{s.target.replace(/^concepts\//,"")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved relations */}
            {relations.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {relations.map((r, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 6px", borderRadius: 4, background: "rgba(128,128,128,0.05)", border: "1px solid rgba(128,128,128,0.1)" }}>
                    <span style={{ fontSize: 10, color: REL_COLORS[r.type] ?? "#888", fontWeight: 600, flexShrink: 0 }}>{REL_LABELS[r.type] ?? r.type}</span>
                    <span style={{ fontSize: 10, color: "var(--color-text-secondary,#aaa)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.target}>{r.target.replace(/^concepts\//,"")}</span>
                  </div>
                ))}
              </div>
            ) : (
              suggestions.length === 0 && (
                <p style={{ margin: 0, fontSize: 10, color: "var(--color-text-tertiary,#888)", fontStyle: "italic" }}>無語義關係。點擊「AI 分類」自動分析 wikilink。</p>
              )
            )}
          </div>

          {/* FIRE Analysis */}
          <WikiFirePanel pagePath={pagePath} />
        </div>
      )}
    </div>
  );
}
