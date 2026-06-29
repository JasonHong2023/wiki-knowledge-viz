import { useState } from "react";
import { Flame, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "../api";

const PLUGIN = "/api/plugins/llm-wiki";

interface FireData {
  fact: string[];
  index: string[];
  relation: string[];
  encyclopedia: string;
}

interface FireResult {
  path: string;
  title: string;
  tags: string[];
  related_pages: string[];
  fire: FireData;
}

const FIRE_COLS: { key: keyof FireData; label: string; color: string; desc: string }[] = [
  { key: "fact",         label: "F — Fact",         color: "text-blue-400",   desc: "客觀事實" },
  { key: "index",        label: "I — Index",        color: "text-green-400",  desc: "索引關鍵字" },
  { key: "relation",     label: "R — Relation",     color: "text-yellow-400", desc: "相關概念" },
  { key: "encyclopedia", label: "E — Encyclopedia", color: "text-purple-400", desc: "百科摘要" },
];

export default function WikiFirePanel({ pagePath }: { pagePath: string }) {
  const [result, setResult] = useState<FireResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`${PLUGIN}/pages/${encodeURIComponent(pagePath)}/fire`);
      if (!res.ok) { setError(`${res.status}: ${await res.text()}`); return; }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-current/10 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Flame className="h-4 w-4 text-orange-400" />
          FIRE 四向分析
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 rounded px-2.5 py-1 text-xs bg-current/10 hover:bg-current/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {result ? "重新生成" : "生成 FIRE 分析"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 mb-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {FIRE_COLS.map(({ key, label, color, desc }) => (
            <div key={key} className="rounded border border-current/10 p-2">
              <div className={`text-xs font-semibold mb-1 ${color}`}>{label}</div>
              <div className="text-xs text-text-tertiary mb-1.5">{desc}</div>
              {key === "encyclopedia" ? (
                <p className="text-xs text-text-primary leading-relaxed">
                  {result.fire.encyclopedia}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {(result.fire[key] as string[]).map((item, i) => (
                    <li key={i} className="text-xs text-text-primary flex gap-1">
                      <span className={`${color} opacity-60`}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {!result && !loading && (
        <p className="text-xs text-text-tertiary text-center py-3">
          點擊「生成 FIRE 分析」，用 LLM 分析此頁面的 Fact / Index / Relation / Encyclopedia
        </p>
      )}
    </div>
  );
}
