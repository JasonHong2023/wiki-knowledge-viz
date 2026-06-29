import { useState, useEffect, useCallback } from "react";
import { CreditCard, Search, RefreshCw, ArrowUpRight, Link2, Link } from "lucide-react";
import { wiki } from "../api";

interface CardItem {
  path: string;
  title: string;
  type: string;
  tags: string[];
  confidence: string;
  updated: string;
  excerpt: string;
  inbound_count: number;
  outbound_count: number;
}

const TYPE_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  entity:     { bg: "rgba(96,165,250,0.15)",  color: "#93c5fd", border: "rgba(96,165,250,0.3)",  label: "Entity" },
  concept:    { bg: "rgba(52,211,153,0.15)",  color: "#6ee7b7", border: "rgba(52,211,153,0.3)",  label: "Concept" },
  comparison: { bg: "rgba(251,191,36,0.15)",  color: "#fde68a", border: "rgba(251,191,36,0.3)",  label: "Comparison" },
  query:      { bg: "rgba(167,139,250,0.15)", color: "#c4b5fd", border: "rgba(167,139,250,0.3)", label: "Query" },
};
const DEFAULT_TYPE = { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.2)", label: "Page" };

const TYPES = ["", "entity", "concept", "comparison", "query"] as const;
const TYPE_LABELS: Record<string, string> = { "": "全部", entity: "Entity", concept: "Concept", comparison: "Comparison", query: "Query" };

export default function WikiCards({ onNavigate }: { onNavigate: (tab: any, path?: string) => void }) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = typeFilter ? `type=${encodeURIComponent(typeFilter)}` : "";
      const data = await wiki.cards(params);
      setCards(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { void load(); }, [load]);

  const filtered = search
    ? cards.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
    : cards;

  const tc = (type: string) => TYPE_COLORS[type] ?? DEFAULT_TYPE;

  return (
    <div className="wiki-space-y-6">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="wiki-flex-center">
          <CreditCard style={{ width: 20, height: 20 }} />
          <h1 className="wiki-heading">Hypercard 卡片視圖</h1>
          <span className="wiki-muted">{filtered.length} 張</span>
        </div>
        <button className="wiki-btn" onClick={() => void load()}>
          <RefreshCw style={{ width: 14, height: 14 }} /> 重新整理
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, opacity: 0.5 }} />
          <input
            className="wiki-search"
            style={{ paddingLeft: 32 }}
            placeholder="搜尋標題或標籤…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {TYPES.map(t => (
            <button
              key={t || "all"}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "1px solid",
                background: typeFilter === t ? (t ? tc(t).bg : "rgba(148,163,184,0.2)") : "transparent",
                color: typeFilter === t ? (t ? tc(t).color : "inherit") : "var(--color-text-tertiary,#888)",
                borderColor: typeFilter === t ? (t ? tc(t).border : "rgba(148,163,184,0.3)") : "rgba(128,128,128,0.2)",
              }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="wiki-loading"><RefreshCw style={{ width: 20, height: 20 }} /><span style={{ marginLeft: 8 }}>載入中…</span></div>}
      {error && <div className="wiki-error">{error}</div>}

      {/* Card Grid */}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.length === 0 && (
            <p className="wiki-muted" style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem 0" }}>
              {search ? `找不到「${search}」的卡片` : "尚無卡片"}
            </p>
          )}
          {filtered.map(card => {
            const isExpanded = expanded === card.path;
            const color = tc(card.type);
            return (
              <div
                key={card.path}
                style={{
                  borderRadius: 10, border: `1px solid ${isExpanded ? color.border : "rgba(128,128,128,0.15)"}`,
                  background: isExpanded ? color.bg : "rgba(128,128,128,0.04)",
                  padding: 16, cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
                  display: "flex", flexDirection: "column", gap: 10,
                }}
                onClick={() => setExpanded(isExpanded ? null : card.path)}
              >
                {/* Type badge + title */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "inline-block", borderRadius: 9999, padding: "1px 8px", fontSize: 10, fontWeight: 600, background: color.bg, color: color.color, border: `1px solid ${color.border}`, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {color.label}
                    </span>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.4, wordBreak: "break-word" }}>
                      {card.title}
                    </p>
                  </div>
                </div>

                {/* Excerpt */}
                <p style={{ fontSize: 12, margin: 0, color: "var(--color-text-secondary,#aaa)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: isExpanded ? 999 : 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {card.excerpt || "（無內容摘要）"}
                </p>

                {/* Tags */}
                {card.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {card.tags.slice(0, isExpanded ? 6 : 3).map(tag => (
                      <span key={tag} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 9999, background: "rgba(128,128,128,0.12)", color: "var(--color-text-tertiary,#888)", border: "1px solid rgba(128,128,128,0.2)" }}>
                        {tag}
                      </span>
                    ))}
                    {!isExpanded && card.tags.length > 3 && (
                      <span style={{ fontSize: 10, color: "var(--color-text-tertiary,#888)" }}>+{card.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--color-text-tertiary,#888)" }}>
                    {card.inbound_count > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Link2 style={{ width: 10, height: 10 }} />←{card.inbound_count}
                      </span>
                    )}
                    {card.outbound_count > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Link style={{ width: 10, height: 10 }} />→{card.outbound_count}
                      </span>
                    )}
                    {card.updated && (
                      <span>{card.updated.slice(0, 10)}</span>
                    )}
                  </div>
                  {isExpanded && (
                    <button
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${color.border}`, background: color.bg, color: color.color, cursor: "pointer" }}
                      onClick={e => { e.stopPropagation(); onNavigate("pages", card.path); }}
                    >
                      <ArrowUpRight style={{ width: 11, height: 11 }} /> 開啟頁面
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
