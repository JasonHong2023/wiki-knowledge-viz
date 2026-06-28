import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  FileText,
  Brain,
  GitCompare,
  Link2,
  Tags,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
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
      setTimeline(t.entries ?? t ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const statCards = useMemo(
    () => [
      { icon: BookOpen, label: "Total Pages", value: stats?.totalPages ?? null, tab: "pages" },
      { icon: FileText, label: "Entities", value: stats?.entitiesCount ?? null },
      { icon: Brain, label: "Concepts", value: stats?.conceptsCount ?? null },
      { icon: GitCompare, label: "Comparisons", value: stats?.comparisonsCount ?? null },
      { icon: Link2, label: "Orphan Pages", value: stats?.orphanCount ?? null },
      { icon: Tags, label: "Tags", value: stats?.tagCount ?? null, tab: "tags" },
    ],
    [stats],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-text-secondary" />
          <h1 className="text-xl font-bold text-text-primary">Wiki Overview</h1>
          {stats?.updated && (
            <span className="ml-2 text-xs text-text-tertiary">
              Updated: {stats.updated}
            </span>
          )}
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 重新整理
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value ?? 0}
              onClick={card.tab ? () => onNavigate(card.tab) : undefined}
            />
          ))}
        </div>
      )}

      {!loading && !error && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-text-secondary">最近活動</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-text-tertiary">尚無活動記錄</p>
          ) : (
            <ul className="space-y-2 max-w-md">
              {timeline.map((entry, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-current/10 bg-current/5 p-3">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.subject}</p>
                    <p className="text-xs text-text-tertiary">{entry.action} · {entry.date}</p>
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

function StatCard({ icon: Icon, label, value, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-current/10 bg-current/5 p-4 ${onClick ? "cursor-pointer hover:bg-current/10 transition-colors" : ""}`}
    >
      <div className="flex items-center gap-2 text-text-tertiary">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
