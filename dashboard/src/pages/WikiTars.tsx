import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, RefreshCw, BookOpen, Trash2, Languages } from "lucide-react";
import { wiki } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { path: string; title: string }[];
  loading?: boolean;
}

type Lang = "auto" | "zh-TW" | "zh-CN" | "en" | "ja";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "auto",  label: "自動偵測" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "zh-CN", label: "简体中文" },
  { value: "en",    label: "English" },
  { value: "ja",    label: "日本語" },
];

const SUGGESTIONS = [
  "這個知識庫主要包含哪些主題？",
  "GraphRAG 是什麼？",
  "幫我整理關於 MCP 的筆記",
  "What is Zettelkasten?",
];

export default function WikiTars({ onNavigate }: { onNavigate: (tab: any, path?: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lang, setLang] = useState<Lang>("auto");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close lang menu on outside click
  useEffect(() => {
    if (!showLangMenu) return;
    function handler(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLangMenu]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg };
    const loadingMsg: Message = { role: "assistant", content: "", loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setSending(true);

    try {
      const history = messages
        .filter(m => !m.loading)
        .map(m => ({ role: m.role, content: m.content }));
      const data = await wiki.tars.chat(msg, history, lang);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.answer || "（無回應）", sources: data.sources ?? [] },
      ]);
    } catch (e) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `錯誤：${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function clearHistory() { setMessages([]); }

  const empty = messages.length === 0;
  const currentLangLabel = LANG_OPTIONS.find(o => o.value === lang)?.label ?? "自動偵測";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", minHeight: 480 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="wiki-flex-center">
          <Bot style={{ width: 20, height: 20 }} />
          <h1 className="wiki-heading">Tars</h1>
          <span className="wiki-muted">wiki 知識對話助手</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Language selector */}
          <div ref={langMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowLangMenu(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 10px",
                borderRadius: 6, border: "1px solid rgba(128,128,128,0.25)", background: showLangMenu ? "rgba(128,128,128,0.1)" : "transparent",
                cursor: "pointer", color: "var(--color-text-secondary,#aaa)",
              }}
            >
              <Languages style={{ width: 13, height: 13 }} />
              {currentLangLabel}
              <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
            </button>
            {showLangMenu && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100,
                background: "var(--color-surface, #1e1e2e)", border: "1px solid rgba(128,128,128,0.2)",
                borderRadius: 8, overflow: "hidden", minWidth: 130, boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}>
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setLang(opt.value); setShowLangMenu(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "8px 14px",
                      fontSize: 13, border: "none", cursor: "pointer", background: "transparent", color: "inherit",
                      borderBottom: "1px solid rgba(128,128,128,0.08)",
                      fontWeight: opt.value === lang ? 600 : 400,
                      color: opt.value === lang ? "#a5b4fc" : "inherit",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(128,128,128,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {opt.value === lang && <span style={{ marginRight: 6 }}>✓</span>}
                    {opt.label}
                    {opt.value === "auto" && (
                      <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 6 }}>偵測問題語言</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!empty && (
            <button className="wiki-btn-ghost" style={{ fontSize: 12, padding: "3px 10px" }} onClick={clearHistory}>
              <Trash2 style={{ width: 12, height: 12 }} /> 清除對話
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
        {empty && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 20 }}>
            <Bot style={{ width: 48, height: 48, opacity: 0.15 }} />
            <p style={{ fontSize: 14, color: "var(--color-text-tertiary,#888)", margin: 0 }}>
              Ask anything about your wiki
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 560 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 9999, border: "1px solid rgba(128,128,128,0.2)", background: "rgba(128,128,128,0.05)", cursor: "pointer", color: "var(--color-text-secondary,#aaa)", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(128,128,128,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(128,128,128,0.05)")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: m.role === "user" ? "rgba(99,102,241,0.2)" : "rgba(52,211,153,0.15)" }}>
              {m.role === "user"
                ? <User style={{ width: 15, height: 15, color: "#a5b4fc" }} />
                : <Bot style={{ width: 15, height: 15, color: "#6ee7b7" }} />
              }
            </div>

            <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{
                padding: "10px 14px", borderRadius: m.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                background: m.role === "user" ? "rgba(99,102,241,0.12)" : "rgba(128,128,128,0.06)",
                border: `1px solid ${m.role === "user" ? "rgba(99,102,241,0.2)" : "rgba(128,128,128,0.12)"}`,
                fontSize: 13, lineHeight: 1.65,
              }}>
                {m.loading ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <RefreshCw style={{ width: 13, height: 13, opacity: 0.5 }} />
                    <span style={{ opacity: 0.5 }}>思考中…</span>
                  </div>
                ) : (
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                    {m.content}
                  </pre>
                )}
              </div>

              {m.sources && m.sources.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {m.sources.map(s => (
                    <button
                      key={s.path}
                      onClick={() => onNavigate("pages", s.path)}
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)", cursor: "pointer" }}
                    >
                      <BookOpen style={{ width: 10, height: 10 }} />
                      {s.title.length > 24 ? s.title.slice(0, 24) + "…" : s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid rgba(128,128,128,0.12)", paddingTop: 14, marginTop: 4 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
            }}
            disabled={sending}
            placeholder="問任何關於你 wiki 的問題… (Enter 送出，Shift+Enter 換行)"
            style={{
              flex: 1, resize: "none", padding: "10px 14px", borderRadius: 10, fontSize: 13, lineHeight: 1.5,
              background: "rgba(128,128,128,0.06)", border: "1px solid rgba(128,128,128,0.2)",
              color: "inherit", fontFamily: "inherit", outline: "none", minHeight: 44, maxHeight: 120,
            }}
            rows={1}
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            style={{
              padding: "10px 16px", borderRadius: 10, border: "none", cursor: input.trim() && !sending ? "pointer" : "not-allowed",
              background: input.trim() && !sending ? "rgba(99,102,241,0.8)" : "rgba(128,128,128,0.1)",
              color: input.trim() && !sending ? "#fff" : "var(--color-text-tertiary,#888)",
              transition: "background 0.15s", display: "flex", alignItems: "center",
            }}
          >
            {sending
              ? <RefreshCw style={{ width: 16, height: 16 }} />
              : <Send style={{ width: 16, height: 16 }} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
