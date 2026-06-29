import { useEffect, useState } from "react";
import { X, Loader2, FileText, Trash2 } from "lucide-react";
import { wiki } from "../api";
import Markdown from "./Markdown";

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
        </div>
      )}
    </div>
  );
}
