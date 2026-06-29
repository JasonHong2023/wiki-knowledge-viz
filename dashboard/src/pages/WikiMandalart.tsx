import { useState, useEffect, useRef } from "react";
import { Grid3x3, Plus, Trash2, RefreshCw, Check, X, Pencil } from "lucide-react";
import { wiki } from "../api";

interface Board {
  id: string;
  title: string;
  cells: string[];
  created: string;
  updated: string;
}

// Grid position mapping: visual index → cells array index
// Visual layout:
//  [1][2][3]
//  [4][0][5]
//  [6][7][8]
const GRID_POS = [1, 2, 3, 4, 0, 5, 6, 7, 8];

const CENTER_IDX = 4; // position of center in GRID_POS array (value 0)

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
    try {
      await wiki.mandalart.update(active.id, { cells: next });
    } catch {}
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

  useEffect(() => { void loadList(); }, []);

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingCell !== null && cellRef.current) cellRef.current.focus();
  }, [editingCell]);

  function startEditTitle() {
    setTitleDraft(active?.title ?? "");
    setEditingTitle(true);
  }

  function startEditCell(gridPos: number) {
    const cellIdx = GRID_POS[gridPos];
    setCellDraft(cells[cellIdx] ?? "");
    setEditingCell(gridPos);
  }

  const isCenter = (gridPos: number) => gridPos === CENTER_IDX;

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
            {/* Title */}
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
                  {saving && <RefreshCw style={{ width: 13, height: 13, opacity: 0.4 }} />}
                </>
              )}
            </div>

            {/* 3×3 Grid */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
              maxWidth: 600,
            }}>
              {GRID_POS.map((cellIdx, gridPos) => {
                const text = cells[cellIdx] ?? "";
                const center = isCenter(gridPos);
                const isEditing = editingCell === gridPos;
                return (
                  <div
                    key={gridPos}
                    onClick={() => { if (!isEditing) startEditCell(gridPos); }}
                    style={{
                      position: "relative",
                      minHeight: center ? 120 : 100,
                      borderRadius: 8,
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
                    {/* Cell index badge */}
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
