import { useState, useEffect, useRef } from "react";
import { Grid3x3, Plus, Trash2, RefreshCw, Check, X, Pencil, ChevronDown, FileText, Image, Presentation, Table } from "lucide-react";
import { wiki } from "../api";
import PptxGenJS from "pptxgenjs";
import * as XLSX from "xlsx";

interface Board {
  id: string;
  title: string;
  cells: string[];
  created: string;
  updated: string;
}

// Grid position mapping: visual index → cells array index
// Visual:  [1][2][3]
//          [4][0][5]
//          [6][7][8]
const GRID_POS = [1, 2, 3, 4, 0, 5, 6, 7, 8];
const CENTER_IDX = 4; // gridPos of center

const GRID_LABELS = ["左上", "上", "右上", "左", "中心", "右", "左下", "下", "右下"];

// ── Canvas text wrap helper ─────────────────────────────────────────────────
function canvasWrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxLines = 14,
) {
  const rawLines = text.split("\n");
  let cy = y;
  let count = 0;
  for (const raw of rawLines) {
    if (count >= maxLines) break;
    if (raw === "") { cy += lineH * 0.4; count++; continue; }
    const words = raw.split(" ");
    let cur = "";
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

// ── Export helpers ──────────────────────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildGrid(cells: string[]): string[][] {
  return [
    [cells[GRID_POS[0]], cells[GRID_POS[1]], cells[GRID_POS[2]]],
    [cells[GRID_POS[3]], cells[GRID_POS[4]], cells[GRID_POS[5]]],
    [cells[GRID_POS[6]], cells[GRID_POS[7]], cells[GRID_POS[8]]],
  ];
}

function doExportMd(title: string, cells: string[]) {
  const trunc = (s: string, n = 22) => {
    const one = s.replace(/\n/g, " ").trim();
    return one.length > n ? one.slice(0, n) + "…" : one;
  };
  const g = buildGrid(cells);
  const lines: string[] = [];
  lines.push(`# ${title}`, "");
  lines.push(`> 核心主題：**${cells[GRID_POS[CENTER_IDX]]}**`, "");
  lines.push("## 九宮格總覽", "");
  lines.push(`| ${trunc(g[0][0])} | ${trunc(g[0][1])} | ${trunc(g[0][2])} |`);
  lines.push("|---|---|---|");
  lines.push(`| ${trunc(g[1][0])} | **${trunc(g[1][1])}** | ${trunc(g[1][2])} |`);
  lines.push(`| ${trunc(g[2][0])} | ${trunc(g[2][1])} | ${trunc(g[2][2])} |`);
  lines.push("", "## 各格詳細內容", "");
  GRID_POS.forEach((cellIdx, gridPos) => {
    const content = cells[cellIdx];
    if (!content) return;
    const label = GRID_LABELS[gridPos];
    const heading = content.split("\n")[0].trim() || label;
    lines.push(`### ${label}${gridPos === CENTER_IDX ? "（核心）" : ""} — ${heading}`, "");
    lines.push(content, "");
  });
  triggerDownload(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }), `${title}.md`);
}

function doExportPng(title: string, cells: string[]) {
  const CELL = 280, GAP = 3, TITLE_H = 64, PAD = 20;
  const W = PAD * 2 + CELL * 3 + GAP * 2;
  const H = TITLE_H + CELL * 3 + GAP * 2;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#13131f";
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `bold 22px "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 42);

  GRID_POS.forEach((cellIdx, gridPos) => {
    const col = gridPos % 3, row = Math.floor(gridPos / 3);
    const x = PAD + col * (CELL + GAP);
    const y = TITLE_H + row * (CELL + GAP);
    const center = gridPos === CENTER_IDX;
    const text = cells[cellIdx] ?? "";

    // Cell bg
    ctx.fillStyle = center ? "#1e1b4b" : "#1a1a2e";
    ctx.beginPath();
    ctx.roundRect(x, y, CELL, CELL, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = center ? "#6366f1" : "#334155";
    ctx.lineWidth = center ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1, 8);
    ctx.stroke();

    // Index badge
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(center ? "●" : String(cellIdx), x + CELL - 10, y + 18);

    // Content
    if (text) {
      ctx.fillStyle = center ? "#a5b4fc" : "#cbd5e1";
      ctx.font = `13px "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif`;
      ctx.textAlign = "left";
      canvasWrapText(ctx, text, x + 13, y + 34, CELL - 26, 18);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.font = `italic 12px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(center ? "核心主題" : "（空）", x + CELL / 2, y + CELL / 2);
    }
  });

  canvas.toBlob(blob => {
    if (blob) triggerDownload(blob, `${title}.png`);
  }, "image/png");
}

async function doExportPptx(title: string, cells: string[]) {
  const pptx = new PptxGenJS();
  (pptx as any).layout = "LAYOUT_WIDE"; // 13.33 × 7.5 in
  const slide = pptx.addSlide();

  // Background
  slide.background = { color: "13131f" };

  // Title text
  slide.addText(title, {
    x: 0.3, y: 0.12, w: 12.7, h: 0.55,
    fontSize: 26, bold: true, color: "e2e8f0",
    fontFace: "Microsoft JhengHei",
  });

  const CW = 4.1, CH = 2.15, SX = 0.3, SY = 0.82, G = 0.07;

  GRID_POS.forEach((cellIdx, gridPos) => {
    const col = gridPos % 3, row = Math.floor(gridPos / 3);
    const center = gridPos === CENTER_IDX;
    const text = cells[cellIdx] ?? "";

    slide.addText(text || (center ? "核心主題" : ""), {
      x: SX + col * (CW + G),
      y: SY + row * (CH + G),
      w: CW, h: CH,
      fontSize: center ? 13 : 11,
      bold: center,
      color: center ? "a5b4fc" : "cbd5e1",
      fontFace: "Microsoft JhengHei",
      fill: { color: center ? "1e1b4b" : "1a1a2e" },
      line: { color: center ? "6366f1" : "334155", width: center ? 2 : 1 },
      valign: "top",
      align: "left",
      margin: [8, 8, 8, 8],
      wrap: true,
    });
  });

  await pptx.writeFile({ fileName: `${title}.pptx` });
}

function doExportXlsx(title: string, cells: string[]) {
  const g = buildGrid(cells);
  const data = [
    [title, "", ""],
    ["", "", ""],
    ...g,
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 42 }, { wch: 42 }, { wch: 42 }];
  ws["!rows"] = [{ hpt: 28 }, { hpt: 8 }, { hpt: 90 }, { hpt: 90 }, { hpt: 90 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title}.xlsx`);
}

// ── Component ───────────────────────────────────────────────────────────────
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
  const exportRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLTextAreaElement>(null);

  async function loadList() {
    setLoading(true);
    try {
      const list = await wiki.mandalart.list();
      setBoards(Array.isArray(list) ? list : []);
    } catch {}
    finally { setLoading(false); }
  }

  async function openBoard(id: string) {
    try {
      const b = await wiki.mandalart.get(id);
      setActive(b);
      setCells(Array.isArray(b.cells) ? b.cells : Array(9).fill(""));
      setEditingCell(null);
    } catch {}
  }

  async function createBoard() {
    setSaving(true);
    try {
      const b = await wiki.mandalart.create({ title: "新曼陀羅" });
      await loadList();
      await openBoard(b.id);
    } catch {}
    finally { setSaving(false); }
  }

  async function saveTitle() {
    if (!active) return;
    setSaving(true);
    try {
      const b = await wiki.mandalart.update(active.id, { title: titleDraft });
      setActive(b);
      setBoards(prev => prev.map(x => x.id === b.id ? { ...x, title: b.title } : x));
    } catch {}
    finally { setSaving(false); setEditingTitle(false); }
  }

  async function saveCell(idx: number, value: string) {
    if (!active) return;
    const next = [...cells];
    next[idx] = value;
    setCells(next);
    setSaving(true);
    try { await wiki.mandalart.update(active.id, { cells: next }); } catch {}
    finally { setSaving(false); }
    setEditingCell(null);
  }

  async function deleteBoard(id: string) {
    setSaving(true);
    try {
      await wiki.mandalart.delete(id);
      await loadList();
      if (active?.id === id) { setActive(null); setCells(Array(9).fill("")); }
    } catch {}
    finally { setSaving(false); setDeleteConfirm(null); }
  }

  // Close export menu on outside click
  useEffect(() => {
    if (!showExport) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setShowExport(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExport]);

  useEffect(() => { void loadList(); }, []);
  useEffect(() => { if (editingTitle && titleRef.current) titleRef.current.focus(); }, [editingTitle]);
  useEffect(() => { if (editingCell !== null && cellRef.current) cellRef.current.focus(); }, [editingCell]);

  function startEditTitle() { setTitleDraft(active?.title ?? ""); setEditingTitle(true); }
  function startEditCell(gridPos: number) {
    const cellIdx = GRID_POS[gridPos];
    setCellDraft(cells[cellIdx] ?? "");
    setEditingCell(gridPos);
  }
  const isCenter = (gridPos: number) => gridPos === CENTER_IDX;

  async function handleExport(fmt: "md" | "png" | "pptx" | "xlsx") {
    if (!active) return;
    setShowExport(false);
    setExporting(true);
    try {
      if (fmt === "md")   doExportMd(active.title, cells);
      if (fmt === "png")  doExportPng(active.title, cells);
      if (fmt === "pptx") await doExportPptx(active.title, cells);
      if (fmt === "xlsx") doExportXlsx(active.title, cells);
    } finally { setExporting(false); }
  }

  const exportOpts: { fmt: "md" | "png" | "pptx" | "xlsx"; label: string; Icon: any; desc: string }[] = [
    { fmt: "md",   label: "Markdown",   Icon: FileText,     desc: ".md" },
    { fmt: "png",  label: "圖片",        Icon: Image,        desc: ".png" },
    { fmt: "pptx", label: "PowerPoint", Icon: Presentation, desc: ".pptx" },
    { fmt: "xlsx", label: "Excel",      Icon: Table,        desc: ".xlsx" },
  ];

  return (
    <div className="wiki-space-y-6">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="wiki-flex-center">
          <Grid3x3 style={{ width: 20, height: 20 }} />
          <h1 className="wiki-heading">iMandalart 九宮格</h1>
        </div>
        <button className="wiki-btn-primary wiki-btn" onClick={createBoard} disabled={saving}>
          <Plus style={{ width: 14, height: 14 }} /> 新建
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, alignItems: "start" }}>
        {/* Board list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-tertiary,#888)", marginBottom: 4 }}>
            我的曼陀羅
          </p>
          {loading && <div className="wiki-loading" style={{ justifyContent: "flex-start", padding: "8px 0" }}><RefreshCw style={{ width: 14, height: 14 }} /></div>}
          {!loading && boards.length === 0 && <p className="wiki-muted" style={{ fontSize: 12 }}>尚無曼陀羅，點「新建」開始</p>}
          {boards.map(b => (
            <div
              key={b.id}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, cursor: "pointer",
                background: active?.id === b.id ? "rgba(99,102,241,0.15)" : "transparent",
                border: `1px solid ${active?.id === b.id ? "rgba(99,102,241,0.3)" : "transparent"}`,
                transition: "background 0.1s",
              }}
              onClick={() => openBoard(b.id)}
            >
              <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {b.title}
              </span>
              {deleteConfirm === b.id ? (
                <div style={{ display: "flex", gap: 3 }}>
                  <button onClick={e => { e.stopPropagation(); void deleteBoard(b.id); }} style={{ padding: "1px 5px", fontSize: 11, borderRadius: 4, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}>確認</button>
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }} style={{ padding: "1px 5px", fontSize: 11, borderRadius: 4, background: "transparent", border: "1px solid rgba(128,128,128,0.2)", cursor: "pointer" }}><X style={{ width: 10, height: 10 }} /></button>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setDeleteConfirm(b.id); }} style={{ padding: 3, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", opacity: 0.4, color: "inherit" }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Board editor */}
        {active ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Title row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {editingTitle ? (
                <>
                  <input
                    ref={titleRef}
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") void saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                    style={{ flex: 1, fontSize: 18, fontWeight: 700, background: "rgba(128,128,128,0.08)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 6, padding: "4px 10px", color: "inherit" }}
                  />
                  <button onClick={() => void saveTitle()} style={{ padding: 5, borderRadius: 5, background: "rgba(99,102,241,0.2)", border: "none", cursor: "pointer", color: "#a5b4fc" }}><Check style={{ width: 14, height: 14 }} /></button>
                  <button onClick={() => setEditingTitle(false)} style={{ padding: 5, borderRadius: 5, background: "transparent", border: "none", cursor: "pointer", opacity: 0.5 }}><X style={{ width: 14, height: 14 }} /></button>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{active.title}</h2>
                  <button onClick={startEditTitle} style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", opacity: 0.4, color: "inherit" }}>
                    <Pencil style={{ width: 13, height: 13 }} />
                  </button>
                  {(saving || exporting) && <RefreshCw style={{ width: 13, height: 13, opacity: 0.4 }} />}

                  {/* Export dropdown */}
                  <div ref={exportRef} style={{ position: "relative", marginLeft: "auto" }}>
                    <button
                      onClick={() => setShowExport(v => !v)}
                      disabled={exporting}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 10px",
                        borderRadius: 6, border: "1px solid rgba(128,128,128,0.25)",
                        background: showExport ? "rgba(128,128,128,0.1)" : "transparent",
                        cursor: "pointer", color: "var(--color-text-secondary,#aaa)",
                      }}
                    >
                      {exporting ? <RefreshCw style={{ width: 12, height: 12 }} /> : null}
                      匯出
                      <ChevronDown style={{ width: 11, height: 11 }} />
                    </button>
                    {showExport && (
                      <div style={{
                        position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100,
                        background: "var(--color-surface,#1e1e2e)", border: "1px solid rgba(128,128,128,0.2)",
                        borderRadius: 8, overflow: "hidden", minWidth: 160, boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                      }}>
                        {exportOpts.map(({ fmt, label, Icon, desc }) => (
                          <button
                            key={fmt}
                            onClick={() => void handleExport(fmt)}
                            style={{
                              display: "flex", alignItems: "center", gap: 10, width: "100%",
                              textAlign: "left", padding: "9px 14px", fontSize: 13,
                              border: "none", borderBottom: "1px solid rgba(128,128,128,0.08)",
                              cursor: "pointer", background: "transparent", color: "inherit",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(128,128,128,0.08)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
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

            {/* 3×3 Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxWidth: 600 }}>
              {GRID_POS.map((cellIdx, gridPos) => {
                const text = cells[cellIdx] ?? "";
                const center = isCenter(gridPos);
                const isEditing = editingCell === gridPos;
                return (
                  <div
                    key={gridPos}
                    onClick={() => { if (!isEditing) startEditCell(gridPos); }}
                    style={{
                      position: "relative", minHeight: center ? 120 : 100, borderRadius: 8,
                      border: isEditing
                        ? "2px solid rgba(99,102,241,0.6)"
                        : center
                          ? "2px solid rgba(99,102,241,0.35)"
                          : "1px solid rgba(128,128,128,0.18)",
                      background: isEditing
                        ? "rgba(99,102,241,0.08)"
                        : center
                          ? "rgba(99,102,241,0.08)"
                          : "rgba(128,128,128,0.04)",
                      cursor: isEditing ? "default" : "pointer",
                      padding: 10,
                      transition: "border-color 0.15s, background 0.15s",
                      display: "flex", flexDirection: "column",
                    }}
                  >
                    <span style={{ position: "absolute", top: 5, right: 7, fontSize: 9, opacity: 0.3, fontFamily: "monospace" }}>
                      {center ? "●" : cellIdx}
                    </span>
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                        <textarea
                          ref={cellRef}
                          value={cellDraft}
                          onChange={e => setCellDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Escape") setEditingCell(null);
                            if (e.key === "Enter" && e.ctrlKey) { void saveCell(cellIdx, cellDraft); }
                          }}
                          style={{
                            flex: 1, resize: "none", fontSize: 13, lineHeight: 1.5,
                            background: "transparent", border: "none", outline: "none",
                            color: "inherit", fontFamily: "inherit", minHeight: center ? 80 : 60,
                          }}
                          placeholder={center ? "核心主題" : "子主題或筆記…"}
                        />
                        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                          <button onClick={() => void saveCell(cellIdx, cellDraft)} style={{ padding: "2px 8px", fontSize: 11, borderRadius: 4, background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", cursor: "pointer" }}>
                            <Check style={{ width: 11, height: 11 }} />
                          </button>
                          <button onClick={() => setEditingCell(null)} style={{ padding: "2px 6px", fontSize: 11, borderRadius: 4, background: "transparent", border: "1px solid rgba(128,128,128,0.2)", cursor: "pointer", opacity: 0.6 }}>
                            <X style={{ width: 11, height: 11 }} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        {text ? (
                          <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", color: center ? "#a5b4fc" : "inherit" }}>
                            {text}
                          </pre>
                        ) : (
                          <span style={{ fontSize: 12, opacity: 0.25, fontStyle: "italic" }}>
                            {center ? "核心主題" : "點擊編輯…"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 11, color: "var(--color-text-tertiary,#888)" }}>
              點格子編輯 · Ctrl+Enter 儲存 · Esc 取消 · 支援 Markdown 格式（- [ ] todo、# 標題等）
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: "var(--color-text-tertiary,#888)" }}>
            <Grid3x3 style={{ width: 48, height: 48, opacity: 0.15 }} />
            <p style={{ fontSize: 14, margin: 0 }}>選擇左側的曼陀羅，或新建一個</p>
          </div>
        )}
      </div>
    </div>
  );
}
