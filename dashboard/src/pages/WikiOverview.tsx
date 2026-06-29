import { useState, useEffect } from "react";
import { BookOpen, FileText, Brain, GitCompare, Link2, Tags, Clock, RefreshCw } from "lucide-react";
import { wiki } from "../api";

interface WikiStats {
  totalPages: number;
  entitiesCount: number;
  conceptsCount: number;
  comparisonsCount: number;
  queriesCount: number;
  orphanCount: number;
  tagCount: number;
  updated: string | null;
  [key: string]: unknown;
}

interface TimelineEntry {
  date: string;
  action: string;
  subject: string;
  details: string;
}

function toEntries(t: unknown): TimelineEntry[] {
  if (Array.isArray(t)) return t as TimelineEntry[];
  if (t && typeof t === "object" && Array.isArray((t as any).entries)) {
    return (t as any).entries as TimelineEntry[];
  }
  return [];
}

export default function WikiOverview({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const [stats, setStats] = useState<WikiStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([wiki.stats(), wiki.timeline(10)]);
      setStats(s);
      setTimeline(toEntries(t));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const statCards = [
    { Icon: BookOpen, label: "Total Pages", value: stats?.totalPages ?? 0, tab: "pages" as const },
    { Icon: FileText, label: "Entities", value: stats?.entitiesCount ?? 0 },
    { Icon: Brain, label: "Concepts", value: stats?.conceptsCount ?? 0 },
    { Icon: GitCompare, label: "Comparisons", value: stats?.comparisonsCount ?? 0 },
    { Icon: Link2, label: "Orphan Pages", value: stats?.orphanCount ?? 0 },
    { Icon: Tags, label: "Tags", value: stats?.tagCount ?? 0, tab: "tags" as const },
  ];

  return (
    <div className="wiki-space-y-6">
      <div className="wiki-flex-between">
        <div className="wiki-flex-center">
          <BookOpen style={{ width: 20, height: 20 }} />
          <h1 className="wiki-heading">Wiki Overview</h1>
          {stats?.updated && (
            <span className="wiki-muted" style={{ marginLeft: "0.5rem" }}>
              Updated: {stats.updated}
            </span>
          )}
        </div>
        <button className="wiki-btn" onClick={() => void load()}>
          <RefreshCw style={{ width: 14, height: 14 }} /> 重新整理
        </button>
      </div>

      {loading && (
        <div className="wiki-loading">
          <span className="wiki-spin"><RefreshCw style={{ width: 24, height: 24 }} /></span>
          <span style={{ marginLeft: "0.5rem" }}>載入中...</span>
        </div>
      )}

      {error && <div className="wiki-error">{error}</div>}

      {!loading && !error && (
        <div className="wiki-stat-grid">
          {statCards.map(({ Icon, label, value, tab }) => (
            <div
              key={label}
              className="wiki-stat-card"
              onClick={tab ? () => onNavigate(tab) : undefined}
              style={!tab ? { cursor: "default" } : {}}
            >
              <Icon style={{ width: 20, height: 20, margin: "0 auto 0.5rem" }} />
              <div className="value">{value}</div>
              <div className="label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div>
          <h2 className="wiki-subheading">最近活動</h2>
          {timeline.length === 0 ? (
            <p className="wiki-muted">尚無活動記錄</p>
          ) : (
            <ul className="wiki-timeline-list">
              {timeline.map((entry, i) => (
                <li key={i} className="wiki-list-item">
                  <Clock style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "0.875rem", fontWeight: 500, margin: 0 }}>{entry.subject}</p>
                    <p className="wiki-muted" style={{ margin: 0 }}>{entry.action} · {entry.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
