import { useState, useEffect, useCallback } from "react";
import { ListTree, ChevronDown, ChevronRight, RefreshCw, Search, Trash2, Download, X } from "lucide-react";
import { wiki } from "../api";
import WikiPageDetail from "../components/WikiPageDetail";

// ── Tag classifier (mirrors Python classify_tag) ──────────────────────────
const _LANG  = new Set(["english","中文","繁體中文","zh-tw","zh-cn","japanese","日文","korean","한국어"]);
const _FMT   = new Set(["markdown","pdf","html","json","yaml","csv","pptx","excel","xlsx"]);
const _PROG  = new Set(["python","typescript","javascript","js","ts","go","rust","java","c++","c#","swift","kotlin","ruby","php","bash","shell"]);
const _AI    = new Set(["llm","gpt","claude","gemini","mistral","ollama","rag","embedding","vector","transformer","bert","chatgpt","anthropic","openai","langchain","graphrag"]);
const _API   = new Set(["api","rest","graphql","grpc","webhook","sdk","oauth","openapi","mcp"]);
const _TECH  = new Set(["docker","kubernetes","git","linux","aws","gcp","azure","ci/cd","nginx","redis","postgresql","mysql","mongodb"]);
const _CONC  = new Set(["architecture","design pattern","algorithm","data structure","oop","functional","microservices","zettelkasten","pkm"]);

function classifyTag(name: string): string {
  const l = name.toLowerCase().trim();
  if (l.startsWith("source:")) return "來源";
  if (_LANG.has(l))  return "語言";
  if (_FMT.has(l))   return "格式";
  if (_PROG.has(l))  return "程式語言";
  if (_AI.has(l) || l.includes("llm") || l === "ai" || l === "ml") return "AI";
  if (_API.has(l))   return "API";
  if (_TECH.has(l))  return "技術";
  if (_CONC.has(l))  return "概念";
  return "主題";
}

const CAT_ORDER = ["AI","技術","程式語言","API","概念","來源","語言","格式","主題"];

const CAT_COLORS: Record<string,string> = {
  "AI":"#f9a8d4","技術":"#86efac","程式語言":"#67e8f9","API":"#fdba74",
  "概念":"#a5b4fc","來源":"#93c5fd","語言":"#d8b4fe","格式":"#fde047","主題":"#94a3b8",
};

const TYPE_BADGE: Record<string,{bg:string;color:string;label:string}> = {
  entity:     {bg:"rgba(96,165,250,0.15)",  color:"#93c5fd", label:"ENT"},
  concept:    {bg:"rgba(52,211,153,0.15)",  color:"#6ee7b7", label:"CON"},
  comparison: {bg:"rgba(251,191,36,0.15)",  color:"#fde68a", label:"CMP"},
  query:      {bg:"rgba(167,139,250,0.15)", color:"#c4b5fd", label:"QRY"},
};

const CONF_COLOR: Record<string,string> = { high:"#4ade80", medium:"#facc15", low:"#f87171" };

const PLUGIN = "/api/plugins/llm-wiki";
function exportPages(paths: string[], fmt: "html"|"json") {
  const q = paths.length ? `&paths=${encodeURIComponent(paths.join(","))}` : "";
  window.open(`${PLUGIN}/export?fmt=${fmt}${q}`, "_blank");
}

interface Page {
  path: string; title: string; type: string; tags: string[];
  confidence: string; inbound_link_count: number; updated: string | null;
}
interface CatNode { id: string; label: string; children: (Page & {id: string})[]; }

function buildTree(pages: Page[], search: string, typeF: string, confF: string): CatNode[] {
  const sq = search.toLowerCase();
  const filtered = pages.filter(p => {
    if (typeF && p.type !== typeF) return false;
    if (confF && p.confidence !== confF) return false;
    if (sq) {
      return p.title.toLowerCase().includes(sq) ||
             p.path.toLowerCase().includes(sq) ||
             p.tags.some(t => t.toLowerCase().includes(sq));
    }
    return true;
  });

  const buckets: Record<string, Page[]> = {};
  for (const cat of CAT_ORDER) buckets[cat] = [];
  for (const p of filtered) {
    let cat = "主題";
    for (const t of p.tags) {
      const c = classifyTag(t);
      if (CAT_ORDER.indexOf(c) < CAT_ORDER.indexOf(cat)) cat = c;
    }
    buckets[cat].push(p);
  }

  const tree: CatNode[] = [];
  let catNum = 0;
  for (const cat of CAT_ORDER) {
    const items = buckets[cat];
    if (!items.length) continue;
    catNum++;
    const sorted = [...items].sort((a,b) => (a.title||a.path).localeCompare(b.title||b.path));
    tree.push({
      id: String(catNum),
      label: cat,
      children: sorted.map((p, i) => ({ ...p, id: `${catNum}.${i+1}` })),
    });
  }
  return tree;
}

export default function WikiIndex({ onRefresh }: { onRefresh: () => void }) {
  const [pages, setPages]     = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);
  const [open, setOpen]       = useState<Set<string>>(new Set(["1","2","3"]));
  const [search, setSearch]   = useState("");
  const [typeF, setTypeF]     = useState("");
  const [confF, setConfF]     = useState("");
  const [selected, setSelected] = useState<string|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await wiki.pages("sort=title&order=asc");
      const list: Page[] = Array.isArray(data) ? data : (data.pages ?? []);
      setPages(list);
      const tree = buildTree(list, "", "", "");
      setOpen(new Set(tree.slice(0,3).map(n => n.id)));
      // 預設開啟最新更新的頁面
      const newest = [...list].sort((a, b) =>
        (b.updated ?? "").localeCompare(a.updated ?? "")
      )[0];
      if (newest) setSelected(prev => prev ?? newest.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(path: string, title: string) {
    if (!confirm(`刪除「${title || path}」？此操作無法復原。`)) return;
    setDeleting(path);
    try {
      const res = await wiki.deletePage(path);
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setPages(prev => {
        const next = prev.filter(p => p.path !== path);
        if (selected === path) {
          const fallback = [...next].sort((a,b) => (b.updated ?? "").localeCompare(a.updated ?? ""))[0];
          setSelected(fallback?.path ?? null);
        }
        return next;
      });
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "刪除失敗");
    } finally { setDeleting(null); }
  }

  function toggle(id: string) {
    setOpen(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function expandAll()   { setOpen(new Set(tree.map(n => n.id))); }
  function collapseAll() { setOpen(new Set()); }

  const tree = buildTree(pages, search, typeF, confF);
  const totalShown = tree.reduce((s, n) => s + n.children.length, 0);

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", width: "100%", overflow: "hidden" }}>
      {/* Main panel */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }} className="wiki-space-y-6">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div className="wiki-flex-center">
            <ListTree style={{ width: 20, height: 20 }} />
            <h1 className="wiki-heading">Pages</h1>
            <span className="wiki-muted">{loading ? "…" : `${totalShown} / ${pages.length}`}</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary,#888)" }}>匯出：</span>
            <button className="wiki-btn" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => exportPages([], "html")}>
              <Download style={{ width: 11, height: 11 }} /> HTML
            </button>
            <button className="wiki-btn" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => exportPages([], "json")}>
              <Download style={{ width: 11, height: 11 }} /> JSON
            </button>
            <button className="wiki-btn-ghost" style={{ fontSize: 12, padding: "3px 10px" }} onClick={expandAll}>展開</button>
            <button className="wiki-btn-ghost" style={{ fontSize: 12, padding: "3px 10px" }} onClick={collapseAll}>收合</button>
            <button className="wiki-btn" onClick={() => void load()}><RefreshCw style={{ width: 13, height: 13 }} /></button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 180px", minWidth: 140 }}>
            <Search style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, opacity: 0.45 }} />
            <input className="wiki-search" style={{ paddingLeft: 28 }} placeholder="搜尋標題、路徑或標籤…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* Type filter */}
          <select value={typeF} onChange={e => setTypeF(e.target.value)}
            style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(128,128,128,0.2)", background: "rgba(128,128,128,0.06)", color: "inherit", cursor: "pointer" }}>
            <option value="">所有類型</option>
            <option value="entity">Entity</option>
            <option value="concept">Concept</option>
            <option value="comparison">Comparison</option>
            <option value="query">Query</option>
          </select>
          {/* Confidence filter */}
          <select value={confF} onChange={e => setConfF(e.target.value)}
            style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(128,128,128,0.2)", background: "rgba(128,128,128,0.06)", color: "inherit", cursor: "pointer" }}>
            <option value="">所有信心度</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {(search || typeF || confF) && (
            <button className="wiki-btn-ghost" style={{ fontSize: 12, padding: "3px 8px" }}
              onClick={() => { setSearch(""); setTypeF(""); setConfF(""); }}>
              <X style={{ width: 12, height: 12 }} /> 清除
            </button>
          )}
        </div>

        {loading && <div className="wiki-loading"><RefreshCw style={{ width: 18, height: 18 }} /><span style={{ marginLeft: 8 }}>載入中…</span></div>}
        {error   && <div className="wiki-error">{error}</div>}

        {/* Tree */}
        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tree.length === 0 && (
              <p className="wiki-muted" style={{ textAlign: "center", padding: "2rem 0" }}>找不到符合的頁面</p>
            )}
            {tree.map(node => {
              const cc = CAT_COLORS[node.label] ?? "#94a3b8";
              const isOpen = open.has(node.id);
              return (
                <div key={node.id} style={{ borderRadius: 8, border: "1px solid rgba(128,128,128,0.12)", overflow: "hidden" }}>
                  {/* Category row */}
                  <button onClick={() => toggle(node.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", background: "rgba(128,128,128,0.04)", border: "none", cursor: "pointer", color: "inherit", textAlign: "left" }}>
                    {isOpen ? <ChevronDown style={{ width: 14, height: 14, opacity: 0.55 }} />
                             : <ChevronRight style={{ width: 14, height: 14, opacity: 0.55 }} />}
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: cc, minWidth: 22 }}>{node.id}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{node.label}</span>
                    <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 9999, background: `${cc}22`, color: cc, border: `1px solid ${cc}44`, marginLeft: 4 }}>{node.children.length}</span>
                  </button>

                  {/* Leaf rows */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid rgba(128,128,128,0.08)" }}>
                      {node.children.map((leaf, idx) => {
                        const tb = TYPE_BADGE[leaf.type];
                        const isSelected = selected === leaf.path;
                        return (
                          <div key={leaf.id}
                            onClick={() => setSelected(leaf.path)}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px 7px 40px", cursor: "pointer",
                              borderTop: idx > 0 ? "1px solid rgba(128,128,128,0.06)" : "none",
                              background: isSelected ? "rgba(99,102,241,0.08)" : "transparent",
                              borderLeft: isSelected ? "2px solid rgba(99,102,241,0.5)" : "2px solid transparent",
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(128,128,128,0.04)"; }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                          >
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-tertiary,#888)", minWidth: 44, flexShrink: 0 }}>{leaf.id}</span>
                            {tb && (
                              <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: tb.bg, color: tb.color, flexShrink: 0, fontWeight: 600 }}>
                                {tb.label}
                              </span>
                            )}
                            <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isSelected ? 500 : 400 }}>
                              {leaf.title || leaf.path}
                            </span>
                            {leaf.confidence && (
                              <span style={{ fontSize: 10, flexShrink: 0, color: CONF_COLOR[leaf.confidence] ?? "#888" }}>
                                {leaf.confidence}
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: "var(--color-text-tertiary,#888)", flexShrink: 0, minWidth: 76, textAlign: "right" }}>
                              {leaf.updated?.slice(0,10) ?? ""}
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); void handleDelete(leaf.path, leaf.title); }}
                              disabled={deleting === leaf.path}
                              style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer",
                                color: "#f87171", opacity: 0, flexShrink: 0, transition: "opacity 0.1s" }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                              title="刪除"
                            >
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side panel */}
      {selected && (
        <div style={{ flex: "0 0 360px", maxWidth: "38%", minWidth: 280, position: "sticky", top: 0, overflow: "hidden" }}>
          <WikiPageDetail
            pagePath={selected}
            onClose={() => setSelected(null)}
            onDelete={path => void handleDelete(path, path)}
          />
        </div>
      )}
    </div>
  );
}
