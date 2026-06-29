import { useState, useEffect, useRef, useMemo } from "react";
import { Grid3x3, Plus, Trash2, RefreshCw, Check, X, Pencil, ChevronDown, ChevronRight,
         FileText, Image, Presentation, Table, Copy, Bot, PenLine, Zap, Circle, Search } from "lucide-react";

function AtomLoader({ size = 72 }: { size?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const c = size / 2;
  const rx = size * 0.44, ry = size * 0.13;
  const er = size * 0.068;
  const ORBITS = [
    { color: "#60a5fa", dur: 2000, tilt: 0 },
    { color: "#a78bfa", dur: 2800, tilt: 60 },
    { color: "#34d399", dur: 3600, tilt: 120 },
  ];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const electrons = svg.querySelectorAll<SVGCircleElement>(".ae");
    const t0 = performance.now();
    let raf: number;
    function tick(now: number) {
      const elapsed = now - t0;
      ORBITS.forEach((o, i) => {
        const phi = ((elapsed % o.dur) / o.dur) * 2 * Math.PI;
        const rad = (o.tilt * Math.PI) / 180;
        const lx = rx * Math.cos(phi), ly = ry * Math.sin(phi);
        const x = c + lx * Math.cos(rad) - ly * Math.sin(rad);
        const y = c + lx * Math.sin(rad) + ly * Math.cos(rad);
        const el = electrons[i];
        if (el) { el.setAttribute("cx", x.toFixed(2)); el.setAttribute("cy", y.toFixed(2)); }
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg ref={svgRef} width={size} height={size}>
      <style>{`@keyframes anuc{0%,100%{opacity:.7;r:${size*.10}px}50%{opacity:1;r:${size*.12}px}}`}</style>
      {ORBITS.map((o, i) => (
        <ellipse key={i} cx={c} cy={c} rx={rx} ry={ry}
          fill="none" stroke={o.color} strokeWidth="1.4" opacity="0.38"
          transform={`rotate(${o.tilt} ${c} ${c})`} />
      ))}
      <circle cx={c} cy={c} r={size * 0.10} fill="#1e40af"
        style={{ animation: "anuc 2s ease-in-out infinite", transformOrigin: `${c}px ${c}px` }} />
      <circle cx={c} cy={c} r={size * 0.06} fill="#93c5fd" />
      {ORBITS.map((o, i) => (
        <circle key={i} className="ae" cx={c + rx} cy={c} r={er} fill={o.color}
          style={{ filter: `drop-shadow(0 0 ${er * 0.9}px ${o.color})` }} />
      ))}
    </svg>
  );
}
import { wiki } from "../api";
import PptxGenJS from "pptxgenjs";
import * as XLSX from "xlsx";

interface Board {
  id: string;
  title: string;
  cells: string[];
  created: string;
  updated: string;
  source?: "manual" | "ai";
  category?: string;
  source_page?: string;
  generated_at?: string;
  linked_from_ai?: string;
}

interface WikiPage {
  path: string;
  title: string;
  inbound_count: number;
  has_board: boolean;
  board_id: string | null;
}

const GRID_POS = [1, 2, 3, 4, 0, 5, 6, 7, 8];
const CENTER_IDX = 4;
const GRID_LABELS = ["左上", "上", "右上", "左", "中心", "右", "左下", "下", "右下"];
const AI_CATEGORIES = ["AI & 技術", "知識管理", "規劃執行", "個人成長", "其他"] as const;
const CAT_COLOR: Record<string, string> = {
  "AI & 技術": "#60a5fa", "知識管理": "#34d399", "規劃執行": "#fbbf24",
  "個人成長": "#c084fc", "其他": "#94a3b8",
};

function classifyPageCategory(page: WikiPage): string {
  const text = (page.title + " " + page.path).toLowerCase();
  if (/ai|llm|gpt|rag|graph|embed|知識圖|機器學習|neural|model/.test(text)) return "AI & 技術";
  if (/api|mcp|sdk|docker|kubernetes|git|程式|frontend|backend|tech/.test(text)) return "AI & 技術";
  if (/pkm|學習|知識|筆記|zettel|wiki|概念|理解/.test(text)) return "知識管理";
  if (/專案|計畫|規劃|流程|pm|okr|管理|project/.test(text)) return "規劃執行";
  if (/成長|職涯|技能|自我|思維|人生/.test(text)) return "個人成長";
  return "其他";
}

// ── Canvas text wrap ─────────────────────────────────────────────────────────
function canvasWrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
    maxW: number, lineH: number, maxLines = 14) {
  const rawLines = text.split("\n"); let cy = y; let count = 0;
  for (const raw of rawLines) {
    if (count >= maxLines) break;
    if (raw === "") { cy += lineH * 0.4; count++; continue; }
    const words = raw.split(" "); let cur = "";
    for (const word of words) {
      const test = cur ? cur + " " + word : word;
      if (ctx.measureText(test).width > maxW) {
        if (cur) { ctx.fillText(cur, x, cy); cy += lineH; count++; cur = word; }
        else { ctx.fillText(word, x, cy); cy += lineH; count++; cur = ""; }
        if (count >= maxLines) break;
      } else { cur = test; }
    }
    if (cur && count < maxLines) { ctx.fillText(cur, x, cy); cy += lineH; count++; }
  }
}

// ── Export helpers ────────────────────────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function buildGrid(cells: string[]): string[][] {
  return [[cells[GRID_POS[0]], cells[GRID_POS[1]], cells[GRID_POS[2]]],
          [cells[GRID_POS[3]], cells[GRID_POS[4]], cells[GRID_POS[5]]],
          [cells[GRID_POS[6]], cells[GRID_POS[7]], cells[GRID_POS[8]]]];
}
function doExportMd(title: string, cells: string[]) {
  const trunc = (s: string, n = 22) => { const o = s.replace(/\n/g, " ").trim(); return o.length > n ? o.slice(0, n) + "…" : o; };
  const g = buildGrid(cells); const lines: string[] = [];
  lines.push(`# ${title}`, "", `> 核心主題：**${cells[GRID_POS[CENTER_IDX]]}**`, "", "## 九宮格總覽", "");
  lines.push(`| ${trunc(g[0][0])} | ${trunc(g[0][1])} | ${trunc(g[0][2])} |`, "|---|---|---|");
  lines.push(`| ${trunc(g[1][0])} | **${trunc(g[1][1])}** | ${trunc(g[1][2])} |`);
  lines.push(`| ${trunc(g[2][0])} | ${trunc(g[2][1])} | ${trunc(g[2][2])} |`, "", "## 各格詳細內容", "");
  GRID_POS.forEach((cellIdx, gridPos) => {
    const content = cells[cellIdx]; if (!content) return;
    lines.push(`### ${GRID_LABELS[gridPos]}${gridPos === CENTER_IDX ? "（核心）" : ""} — ${content.split("\n")[0].trim()}`, "", content, "");
  });
  triggerDownload(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }), `${title}.md`);
}
function doExportPng(title: string, cells: string[]) {
  const CELL = 280, GAP = 3, TITLE_H = 64, PAD = 20;
  const W = PAD * 2 + CELL * 3 + GAP * 2, H = TITLE_H + CELL * 3 + GAP * 2;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#13131f"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e2e8f0"; ctx.font = `bold 22px "Noto Sans TC", system-ui`; ctx.textAlign = "center"; ctx.fillText(title, W / 2, 42);
  GRID_POS.forEach((cellIdx, gridPos) => {
    const col = gridPos % 3, row = Math.floor(gridPos / 3);
    const x = PAD + col * (CELL + GAP), y = TITLE_H + row * (CELL + GAP);
    const center = gridPos === CENTER_IDX; const text = cells[cellIdx] ?? "";
    ctx.fillStyle = center ? "#1e1b4b" : "#1a1a2e"; ctx.beginPath(); ctx.roundRect(x, y, CELL, CELL, 8); ctx.fill();
    ctx.strokeStyle = center ? "#6366f1" : "#334155"; ctx.lineWidth = center ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1, 8); ctx.stroke();
    if (text) { ctx.fillStyle = center ? "#a5b4fc" : "#cbd5e1"; ctx.font = `13px "Noto Sans TC", system-ui`; ctx.textAlign = "left"; canvasWrapText(ctx, text, x + 13, y + 34, CELL - 26, 18); }
    else { ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.font = `italic 12px system-ui`; ctx.textAlign = "center"; ctx.fillText(center ? "核心主題" : "（空）", x + CELL / 2, y + CELL / 2); }
  });
  canvas.toBlob(blob => { if (blob) triggerDownload(blob, `${title}.png`); }, "image/png");
}
async function doExportPptx(title: string, cells: string[]) {
  const pptx = new PptxGenJS(); (pptx as any).layout = "LAYOUT_WIDE";
  const slide = pptx.addSlide(); slide.background = { color: "13131f" };
  slide.addText(title, { x: 0.3, y: 0.12, w: 12.7, h: 0.55, fontSize: 26, bold: true, color: "e2e8f0", fontFace: "Microsoft JhengHei" });
  const CW = 4.1, CH = 2.15, SX = 0.3, SY = 0.82, G = 0.07;
  GRID_POS.forEach((cellIdx, gridPos) => {
    const col = gridPos % 3, row = Math.floor(gridPos / 3); const center = gridPos === CENTER_IDX;
    slide.addText(cells[cellIdx] || (center ? "核心主題" : ""), { x: SX + col * (CW + G), y: SY + row * (CH + G), w: CW, h: CH, fontSize: center ? 13 : 11, bold: center, color: center ? "a5b4fc" : "cbd5e1", fontFace: "Microsoft JhengHei", fill: { color: center ? "1e1b4b" : "1a1a2e" }, line: { color: center ? "6366f1" : "334155", width: center ? 2 : 1 }, valign: "top", align: "left", margin: [8, 8, 8, 8], wrap: true });
  });
  await pptx.writeFile({ fileName: `${title}.pptx` });
}
function doExportXlsx(title: string, cells: string[]) {
  const g = buildGrid(cells); const data = [[title, "", ""], ["", "", ""], ...g];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 42 }, { wch: 42 }, { wch: 42 }];
  ws["!rows"] = [{ hpt: 28 }, { hpt: 8 }, { hpt: 90 }, { hpt: 90 }, { hpt: 90 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title}.xlsx`);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WikiMandalart() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [active, setActive] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [cells, setCells] = useState<string[]>(Array(9).fill(""));
  const [editingCell, setEditingCell] = useState<number | null>(null);
  const [cellDraft, setCellDraft] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Two-pile state
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // AI tab: wiki pages with board status
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [generatingPage, setGeneratingPage] = useState<string | null>(null); // path currently generating
  const [genError, setGenError] = useState<string>("");

  // Selected wiki page path in AI tab (before board is loaded)
  const [selectedAIPath, setSelectedAIPath] = useState<string | null>(null);

  // Copy-to-manual confirm
  const [copyConfirm, setCopyConfirm] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLTextAreaElement>(null);

  const manualBoards = useMemo(() => {
    const all = boards.filter(b => (b.source ?? "manual") === "manual");
    if (!searchQuery.trim()) return all;
    const q = searchQuery.trim().toLowerCase();
    return all.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (Array.isArray(b.cells) && b.cells.some(c => typeof c === "string" && c.toLowerCase().includes(q)))
    );
  }, [boards, searchQuery]);

  const isActiveAI = active?.source === "ai";

  // Group wiki pages by category (with search filter)
  const wikiPagesByCategory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q ? wikiPages.filter(p => p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)) : wikiPages;
    const map: Record<string, WikiPage[]> = {};
    for (const p of filtered) {
      const cat = classifyPageCategory(p);
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    }
    return map;
  }, [wikiPages, searchQuery]);

  async function loadList() {
    setLoading(true);
    try {
      const list = await wiki.mandalart.list();
      setBoards(Array.isArray(list) ? list : []);
    } catch {} finally { setLoading(false); }
  }

  async function loadWikiPages() {
    setLoadingPages(true);
    try {
      const pages = await wiki.mandalart.wikiPages();
      setWikiPages(Array.isArray(pages) ? pages : []);
    } catch {} finally { setLoadingPages(false); }
  }

  async function openBoard(id: string) {
    try {
      const b = await wiki.mandalart.get(id);
      setActive(b);
      setCells(Array.isArray(b.cells) ? b.cells : Array(9).fill(""));
      setEditingCell(null);
      setEditingTitle(false);
    } catch {}
  }

  async function handleAIPageClick(page: WikiPage) {
    setSelectedAIPath(page.path);
    setGenError("");
    if (page.has_board && page.board_id) {
      await openBoard(page.board_id);
      return;
    }
    // Auto-generate
    setGeneratingPage(page.path);
    setActive(null);
    try {
      const result = await wiki.mandalart.generate(page.path);
      if (result.duplicate) {
        await openBoard(result.board.id);
        await loadList();
        await loadWikiPages();
        return;
      }
      await loadList();
      await loadWikiPages();
      await openBoard(result.id);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "生成失敗，請重試");
    } finally {
      setGeneratingPage(null);
    }
  }

  async function createBoard() {
    setSaving(true);
    try {
      const b = await wiki.mandalart.create({ title: "新曼陀羅" });
      await loadList();
      await openBoard(b.id);
      setActiveTab("manual");
    } catch {} finally { setSaving(false); }
  }

  async function saveTitle() {
    if (!active) return; setSaving(true);
    try {
      const b = await wiki.mandalart.update(active.id, { title: titleDraft });
      setActive(b); setBoards(prev => prev.map(x => x.id === b.id ? { ...x, title: b.title } : x));
    } catch {} finally { setSaving(false); setEditingTitle(false); }
  }

  async function saveCell(idx: number, value: string) {
    if (!active) return;
    const next = [...cells]; next[idx] = value; setCells(next); setSaving(true);
    try { await wiki.mandalart.update(active.id, { cells: next }); } catch {}
    finally { setSaving(false); } setEditingCell(null);
  }

  async function deleteBoard(id: string) {
    setSaving(true);
    try {
      await wiki.mandalart.delete(id); await loadList();
      if (active?.id === id) { setActive(null); setCells(Array(9).fill("")); }
      if (activeTab === "ai") await loadWikiPages();
    } catch {} finally { setSaving(false); setDeleteConfirm(null); }
  }

  async function doCopyToManual(id: string) {
    setCopying(true);
    try {
      const b = await wiki.mandalart.copyToManual(id);
      await loadList(); await openBoard(b.id); setActiveTab("manual"); setCopyConfirm(null);
    } catch {} finally { setCopying(false); }
  }

  useEffect(() => {
    if (!showExport) return;
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showExport]);

  useEffect(() => { void loadList(); }, []);
  useEffect(() => { if (editingTitle && titleRef.current) titleRef.current.focus(); }, [editingTitle]);
  useEffect(() => { if (editingCell !== null && cellRef.current) cellRef.current.focus(); }, [editingCell]);

  // Load wiki pages when switching to AI tab
  useEffect(() => {
    if (activeTab === "ai") void loadWikiPages();
  }, [activeTab]);

  function startEditTitle() { setTitleDraft(active?.title ?? ""); setEditingTitle(true); }
  function startEditCell(gridPos: number) { const cellIdx = GRID_POS[gridPos]; setCellDraft(cells[cellIdx] ?? ""); setEditingCell(gridPos); }
  const isCenter = (gridPos: number) => gridPos === CENTER_IDX;

  async function handleExport(fmt: "md" | "png" | "pptx" | "xlsx") {
    if (!active) return; setShowExport(false); setExporting(true);
    try {
      if (fmt === "md")   doExportMd(active.title, cells);
      if (fmt === "png")  doExportPng(active.title, cells);
      if (fmt === "pptx") await doExportPptx(active.title, cells);
      if (fmt === "xlsx") doExportXlsx(active.title, cells);
    } finally { setExporting(false); }
  }

  const exportOpts: { fmt: "md" | "png" | "pptx" | "xlsx"; label: string; Icon: any; desc: string }[] = [
    { fmt: "md", label: "Markdown", Icon: FileText, desc: ".md" },
    { fmt: "png", label: "圖片", Icon: Image, desc: ".png" },
    { fmt: "pptx", label: "PowerPoint", Icon: Presentation, desc: ".pptx" },
    { fmt: "xlsx", label: "Excel", Icon: Table, desc: ".xlsx" },
  ];

  // ── Render helpers ──────────────────────────────────────────────────────────
  function renderManualBoardItem(b: Board) {
    const isActiveSel = active?.id === b.id;
    return (
      <div key={b.id}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, cursor: "pointer",
          background: isActiveSel ? "rgba(99,102,241,0.15)" : "transparent",
          border: `1px solid ${isActiveSel ? "rgba(99,102,241,0.3)" : "transparent"}` }}
        onClick={() => openBoard(b.id)}>
        <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
        {deleteConfirm === b.id ? (
          <div style={{ display: "flex", gap: 3 }}>
            <button onClick={e => { e.stopPropagation(); void deleteBoard(b.id); }}
              style={{ padding: "1px 5px", fontSize: 11, borderRadius: 4, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}>確認</button>
            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}
              style={{ padding: "1px 5px", fontSize: 11, borderRadius: 4, background: "transparent", border: "1px solid rgba(128,128,128,0.2)", cursor: "pointer" }}><X style={{ width: 10, height: 10 }} /></button>
          </div>
        ) : (
          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(b.id); }}
            style={{ padding: 3, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", opacity: 0.4, color: "inherit" }}>
            <Trash2 style={{ width: 12, height: 12 }} /></button>
        )}
      </div>
    );
  }

  function renderAIPageItem(page: WikiPage) {
    const isSelected = selectedAIPath === page.path;
    const isGenerating = generatingPage === page.path;
    const dotColor = page.has_board ? "#34d399" : "#4b5563";
    return (
      <div key={page.path}
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 6, cursor: "pointer",
          background: isSelected ? "rgba(96,165,250,0.12)" : "transparent",
          border: `1px solid ${isSelected ? "rgba(96,165,250,0.3)" : "transparent"}`,
          opacity: isGenerating ? 0.7 : 1 }}
        onClick={() => !isGenerating && void handleAIPageClick(page)}>
        {isGenerating
          ? <AtomLoader size={14} />
          : <Circle style={{ width: 7, height: 7, color: dotColor, fill: dotColor, flexShrink: 0 }} />
        }
        <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: isSelected ? "#93c5fd" : "inherit" }}>
          {page.title}
        </span>
        {page.has_board && !isGenerating && (
          <span style={{ fontSize: 9, opacity: 0.4 }}>✓</span>
        )}
        {/* Delete board button for pages that have one */}
        {page.has_board && page.board_id && !isGenerating && (
          deleteConfirm === page.board_id ? (
            <div style={{ display: "flex", gap: 3 }}>
              <button onClick={e => { e.stopPropagation(); void deleteBoard(page.board_id!); }}
                style={{ padding: "1px 5px", fontSize: 11, borderRadius: 4, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}>確認</button>
              <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}
                style={{ padding: "1px 5px", fontSize: 11, borderRadius: 4, background: "transparent", border: "1px solid rgba(128,128,128,0.2)", cursor: "pointer" }}><X style={{ width: 10, height: 10 }} /></button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(page.board_id!); }}
              style={{ padding: 3, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", opacity: 0.35, color: "inherit" }}>
              <Trash2 style={{ width: 11, height: 11 }} /></button>
          )
        )}
      </div>
    );
  }

  function renderGrid(readonly = false) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxWidth: 600 }}>
        {GRID_POS.map((cellIdx, gridPos) => {
          const text = cells[cellIdx] ?? "";
          const center = isCenter(gridPos);
          const isEditing = !readonly && editingCell === gridPos;
          return (
            <div key={gridPos}
              onClick={() => { if (!readonly && !isEditing) startEditCell(gridPos); }}
              style={{ position: "relative", minHeight: center ? 120 : 100, borderRadius: 8,
                border: isEditing ? "2px solid rgba(99,102,241,0.6)" : center ? "2px solid rgba(99,102,241,0.35)" : "1px solid rgba(128,128,128,0.18)",
                background: isEditing ? "rgba(99,102,241,0.08)" : center ? "rgba(99,102,241,0.08)" : "rgba(128,128,128,0.04)",
                cursor: readonly ? "default" : (isEditing ? "default" : "pointer"),
                padding: 10, transition: "border-color 0.15s", display: "flex", flexDirection: "column" }}>
              <span style={{ position: "absolute", top: 5, right: 7, fontSize: 9, opacity: 0.3, fontFamily: "monospace" }}>
                {center ? "●" : cellIdx}
              </span>
              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <textarea ref={cellRef} value={cellDraft} onChange={e => setCellDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") setEditingCell(null); if (e.key === "Enter" && e.ctrlKey) void saveCell(cellIdx, cellDraft); }}
                    style={{ flex: 1, resize: "none", fontSize: 13, lineHeight: 1.5, background: "transparent", border: "none", outline: "none", color: "inherit", fontFamily: "inherit", minHeight: center ? 80 : 60 }}
                    placeholder={center ? "核心主題" : "子主題或筆記…"} />
                  <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                    <button onClick={() => void saveCell(cellIdx, cellDraft)}
                      style={{ padding: "2px 8px", fontSize: 11, borderRadius: 4, background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", cursor: "pointer" }}>
                      <Check style={{ width: 11, height: 11 }} /></button>
                    <button onClick={() => setEditingCell(null)}
                      style={{ padding: "2px 6px", fontSize: 11, borderRadius: 4, background: "transparent", border: "1px solid rgba(128,128,128,0.2)", cursor: "pointer", opacity: 0.6 }}>
                      <X style={{ width: 11, height: 11 }} /></button>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, overflow: "hidden" }}>
                  {text
                    ? <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", color: center ? "#a5b4fc" : "inherit" }}>{text}</pre>
                    : <span style={{ fontSize: 12, opacity: 0.25, fontStyle: "italic" }}>{center ? "核心主題" : (readonly ? "（空）" : "點擊編輯…")}</span>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── AI right-side placeholder ─────────────────────────────────────────────
  function renderAIPlaceholder() {
    if (generatingPage) {
      const pageTitle = wikiPages.find(p => p.path === generatingPage)?.title ?? generatingPage;
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 20 }}>
          <AtomLoader size={80} />
          <p style={{ fontSize: 14, margin: 0, color: "var(--color-text-secondary,#aaa)" }}>
            正在為「{pageTitle}」生成九宮格…
          </p>
          <p style={{ fontSize: 12, margin: 0, color: "var(--color-text-tertiary,#888)" }}>LLM 綜合 Wiki 相關筆記中，請稍候</p>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: "var(--color-text-tertiary,#888)" }}>
        <Bot style={{ width: 48, height: 48, opacity: 0.15 }} />
        <p style={{ fontSize: 14, margin: 0 }}>點擊左側頁面</p>
        <p style={{ fontSize: 12, margin: 0, opacity: 0.6 }}>
          <span style={{ color: "#34d399" }}>●</span> 已生成
          <span style={{ color: "#4b5563" }}>●</span> 點擊自動生成
        </p>
        {genError && <p style={{ fontSize: 12, color: "#f87171", margin: "8px 0 0" }}>{genError}</p>}
      </div>
    );
  }

  return (
    <div className="wiki-space-y-6">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="wiki-flex-center">
          <Grid3x3 style={{ width: 20, height: 20 }} />
          <h1 className="wiki-heading">iMandalart 九宮格</h1>
        </div>
        {activeTab === "manual" && (
          <button className="wiki-btn-primary wiki-btn" onClick={createBoard} disabled={saving}>
            <Plus style={{ width: 14, height: 14 }} /> 新建
          </button>
        )}
        {activeTab === "ai" && (
          <button className="wiki-btn" onClick={() => void loadWikiPages()} disabled={loadingPages}
            style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <RefreshCw style={{ width: 13, height: 13, opacity: loadingPages ? 1 : 0.5 }} /> 重新同步
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, alignItems: "start" }}>
        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Tab buttons */}
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(128,128,128,0.2)", marginBottom: 4 }}>
            {(["manual", "ai"] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                style={{ flex: 1, padding: "5px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                  background: activeTab === tab ? "rgba(99,102,241,0.2)" : "transparent",
                  color: activeTab === tab ? "#a5b4fc" : "var(--color-text-tertiary,#888)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {tab === "manual" ? <><PenLine style={{ width: 11, height: 11 }} />人工</> : <><Bot style={{ width: 11, height: 11 }} />AI</>}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 4 }}>
            <Search style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, opacity: 0.4, pointerEvents: "none" }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={activeTab === "manual" ? "搜尋標題或格子內容…" : "搜尋頁面…"}
              style={{ width: "100%", boxSizing: "border-box", paddingLeft: 26, paddingRight: searchQuery ? 24 : 8, paddingTop: 5, paddingBottom: 5, fontSize: 12, borderRadius: 6, border: "1px solid rgba(128,128,128,0.2)", background: "rgba(128,128,128,0.06)", color: "inherit", outline: "none" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.5, color: "inherit", display: "flex" }}>
                <X style={{ width: 11, height: 11 }} />
              </button>
            )}
          </div>

          {/* Manual list */}
          {activeTab === "manual" && (
            <>
              {loading && <div className="wiki-loading" style={{ justifyContent: "flex-start", padding: "8px 0" }}><RefreshCw style={{ width: 14, height: 14 }} /></div>}
              {!loading && manualBoards.length === 0 && (
                <p className="wiki-muted" style={{ fontSize: 12 }}>
                  {searchQuery ? `找不到「${searchQuery}」` : "尚無曼陀羅，點「新建」開始"}
                </p>
              )}
              {!loading && manualBoards.map(b => renderManualBoardItem(b))}
            </>
          )}

          {/* AI list: wiki pages grouped by category */}
          {activeTab === "ai" && (
            <>
              {loadingPages && <div className="wiki-loading" style={{ justifyContent: "flex-start", padding: "8px 0" }}><RefreshCw style={{ width: 14, height: 14 }} /></div>}
              {!loadingPages && wikiPages.length === 0 && (
                <p className="wiki-muted" style={{ fontSize: 12 }}>找不到 Wiki 頁面</p>
              )}
              {!loadingPages && wikiPages.length > 0 && Object.keys(wikiPagesByCategory).length === 0 && searchQuery && (
                <p className="wiki-muted" style={{ fontSize: 12 }}>找不到「{searchQuery}」</p>
              )}
              {!loadingPages && AI_CATEGORIES.filter(cat => wikiPagesByCategory[cat]?.length > 0).map(cat => {
                const collapsed = collapsedCats.has(cat);
                const color = CAT_COLOR[cat] ?? "#94a3b8";
                const pages = wikiPagesByCategory[cat] ?? [];
                const generatedCount = pages.filter(p => p.has_board).length;
                return (
                  <div key={cat}>
                    <button onClick={() => setCollapsedCats(prev => { const s = new Set(prev); s.has(cat) ? s.delete(cat) : s.add(cat); return s; })}
                      style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", padding: "4px 6px", background: "transparent", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {collapsed ? <ChevronRight style={{ width: 10, height: 10 }} /> : <ChevronDown style={{ width: 10, height: 10 }} />}
                      <span style={{ flex: 1 }}>{cat}</span>
                      <span style={{ fontSize: 10, opacity: 0.6 }}>{generatedCount}/{pages.length}</span>
                    </button>
                    {!collapsed && pages.map(p => renderAIPageItem(p))}
                  </div>
                );
              })}
              {!loadingPages && wikiPages.length > 0 && (
                <p style={{ fontSize: 10, color: "var(--color-text-tertiary,#888)", margin: "8px 0 0", padding: "0 6px", lineHeight: 1.4 }}>
                  <span style={{ color: "#34d399" }}>●</span> 已生成　<span style={{ color: "#4b5563" }}>●</span> 點擊生成
                </p>
              )}
            </>
          )}
        </div>

        {/* Main area */}
        {activeTab === "manual" && active && (b => (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Title row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {editingTitle ? (
                <>
                  <input ref={titleRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") void saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                    style={{ flex: 1, fontSize: 18, fontWeight: 700, background: "rgba(128,128,128,0.08)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 6, padding: "4px 10px", color: "inherit" }} />
                  <button onClick={() => void saveTitle()} style={{ padding: 5, borderRadius: 5, background: "rgba(99,102,241,0.2)", border: "none", cursor: "pointer", color: "#a5b4fc" }}><Check style={{ width: 14, height: 14 }} /></button>
                  <button onClick={() => setEditingTitle(false)} style={{ padding: 5, borderRadius: 5, background: "transparent", border: "none", cursor: "pointer", opacity: 0.5 }}><X style={{ width: 14, height: 14 }} /></button>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>{b.title}</h2>
                  <button onClick={startEditTitle} style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", opacity: 0.4, color: "inherit" }}><Pencil style={{ width: 13, height: 13 }} /></button>
                  {(saving || exporting) && <RefreshCw style={{ width: 13, height: 13, opacity: 0.4 }} />}
                  <div ref={exportRef} style={{ position: "relative" }}>
                    <button onClick={() => setShowExport(v => !v)} disabled={exporting}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(128,128,128,0.25)", background: showExport ? "rgba(128,128,128,0.1)" : "transparent", cursor: "pointer", color: "var(--color-text-secondary,#aaa)" }}>
                      匯出 <ChevronDown style={{ width: 11, height: 11 }} />
                    </button>
                    {showExport && (
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100, background: "var(--color-surface,#1e1e2e)", border: "1px solid rgba(128,128,128,0.2)", borderRadius: 8, overflow: "hidden", minWidth: 160, boxShadow: "0 4px 16px rgba(0,0,0,0.35)" }}>
                        {exportOpts.map(({ fmt, label, Icon, desc }) => (
                          <button key={fmt} onClick={() => void handleExport(fmt)}
                            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, border: "none", borderBottom: "1px solid rgba(128,128,128,0.08)", cursor: "pointer", background: "transparent", color: "inherit" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(128,128,128,0.08)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <Icon style={{ width: 14, height: 14, opacity: 0.7 }} />
                            <span style={{ flex: 1 }}>{label}</span>
                            <span style={{ fontSize: 10, opacity: 0.4 }}>{desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {renderGrid(false)}
            <p style={{ fontSize: 11, color: "var(--color-text-tertiary,#888)" }}>
              點格子編輯 · Ctrl+Enter 儲存 · Esc 取消
              {b.linked_from_ai && <span style={{ marginLeft: 8, opacity: 0.6 }}>· 由 AI 版本複製而來</span>}
            </p>
          </div>
        ))(active)}

        {activeTab === "manual" && !active && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: "var(--color-text-tertiary,#888)" }}>
            <Grid3x3 style={{ width: 48, height: 48, opacity: 0.15 }} />
            <p style={{ fontSize: 14, margin: 0 }}>選擇左側的曼陀羅，或新建一個</p>
          </div>
        )}

        {activeTab === "ai" && active && isActiveAI && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>{active.title}</h2>
              {active.category && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: `${CAT_COLOR[active.category] ?? "#94a3b8"}22`, color: CAT_COLOR[active.category] ?? "#94a3b8", border: `1px solid ${CAT_COLOR[active.category] ?? "#94a3b8"}55` }}>
                  {active.category}
                </span>
              )}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)", display: "flex", alignItems: "center", gap: 3 }}>
                <Bot style={{ width: 10, height: 10 }} /> AI 生成
              </span>
              {(saving || exporting) && <RefreshCw style={{ width: 13, height: 13, opacity: 0.4 }} />}
              <div ref={exportRef} style={{ position: "relative" }}>
                <button onClick={() => setShowExport(v => !v)} disabled={exporting}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(128,128,128,0.25)", background: showExport ? "rgba(128,128,128,0.1)" : "transparent", cursor: "pointer", color: "var(--color-text-secondary,#aaa)" }}>
                  匯出 <ChevronDown style={{ width: 11, height: 11 }} />
                </button>
                {showExport && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100, background: "var(--color-surface,#1e1e2e)", border: "1px solid rgba(128,128,128,0.2)", borderRadius: 8, overflow: "hidden", minWidth: 160, boxShadow: "0 4px 16px rgba(0,0,0,0.35)" }}>
                    {exportOpts.map(({ fmt, label, Icon, desc }) => (
                      <button key={fmt} onClick={() => void handleExport(fmt)}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, border: "none", borderBottom: "1px solid rgba(128,128,128,0.08)", cursor: "pointer", background: "transparent", color: "inherit" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(128,128,128,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <Icon style={{ width: 14, height: 14, opacity: 0.7 }} />
                        <span style={{ flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 10, opacity: 0.4 }}>{desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {renderGrid(true)}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {active.source_page && <span style={{ fontSize: 11, color: "var(--color-text-tertiary,#888)" }}>來源：{active.source_page}</span>}
              {active.generated_at && <span style={{ fontSize: 11, color: "var(--color-text-tertiary,#888)" }}>生成於 {active.generated_at.slice(0, 10)}</span>}
              <button onClick={() => setCopyConfirm(active.id)}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "5px 12px", borderRadius: 6, cursor: "pointer", background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                <Copy style={{ width: 12, height: 12 }} /> 編輯（複製到人工）
              </button>
              <button onClick={() => { void handleAIPageClick({ path: active.source_page ?? "", title: active.title, inbound_count: 0, has_board: false, board_id: null }); }}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "5px 12px", borderRadius: 6, cursor: "pointer", background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}>
                <Zap style={{ width: 12, height: 12 }} /> 重新生成
              </button>
            </div>
          </div>
        )}

        {activeTab === "ai" && (!active || !isActiveAI) && renderAIPlaceholder()}
      </div>

      {/* Copy-to-manual confirm modal */}
      {copyConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => !copying && setCopyConfirm(null)}>
          <div style={{ background: "var(--color-surface,#1e1e2e)", border: "1px solid rgba(128,128,128,0.25)", borderRadius: 12, padding: 24, maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700 }}>複製到人工堆？</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary,#aaa)", lineHeight: 1.6 }}>
              原始 AI 版本會保留。<br />複製後自動切換到人工 tab 並可編輯。
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setCopyConfirm(null)} disabled={copying}
                style={{ padding: "6px 16px", borderRadius: 6, border: "1px solid rgba(128,128,128,0.25)", background: "transparent", cursor: "pointer", fontSize: 13 }}>取消</button>
              <button onClick={() => void doCopyToManual(copyConfirm)} disabled={copying}
                style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "rgba(99,102,241,0.25)", color: "#a5b4fc", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                {copying ? <RefreshCw style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
                確認複製
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
