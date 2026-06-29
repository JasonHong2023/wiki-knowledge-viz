import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Trash2, Download } from "lucide-react";
import { wiki } from "../api";
import WikiPageDetail from "../components/WikiPageDetail";

const PLUGIN = "/api/plugins/llm-wiki";

function exportPages(paths: string[], fmt: "html" | "json") {
  const query = paths.length ? `&paths=${encodeURIComponent(paths.join(","))}` : "";
  window.open(`${PLUGIN}/export?fmt=${fmt}${query}`, "_blank");
}

interface WikiPage {
  path: string;
  title: string;
  type: string;
  tags: string[];
  confidence: string;
  inbound_link_count: number;
  inboundLinks: string[];
  outboundLinks: string[];
  created: string | null;
  updated: string | null;
}

interface PageFilters {
  type: string;
  tag: string;
  confidence: string;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const hasTime = d.includes("T") || d.includes(" ");
    if (hasTime) {
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

// Inline filter bar (replaces @/components/PageFilterBar)
function PageFilterBar({
  filters,
  allTags,
  onChange,
}: {
  filters: PageFilters;
  allTags: string[];
  onChange: (f: PageFilters) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <select
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value })}
        className="rounded-md border border-current/20 bg-current/5 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-current/40 transition-colors"
      >
        <option value="">所有類型</option>
        <option value="note">note</option>
        <option value="concept">concept</option>
        <option value="guide">guide</option>
        <option value="reference">reference</option>
        <option value="api">api</option>
      </select>

      <select
        value={filters.tag}
        onChange={(e) => onChange({ ...filters, tag: e.target.value })}
        className="rounded-md border border-current/20 bg-current/5 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-current/40 transition-colors"
      >
        <option value="">所有標籤</option>
        {allTags.map((tag) => (
          <option key={tag} value={tag}>{tag}</option>
        ))}
      </select>

      <select
        value={filters.confidence}
        onChange={(e) => onChange({ ...filters, confidence: e.target.value })}
        className="rounded-md border border-current/20 bg-current/5 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-current/40 transition-colors"
      >
        <option value="">所有信心度</option>
        <option value="high">high</option>
        <option value="medium">medium</option>
        <option value="low">low</option>
      </select>

      {(filters.type || filters.tag || filters.confidence) && (
        <button
          onClick={() => onChange({ type: "", tag: "", confidence: "" })}
          className="rounded-md border border-current/20 px-2.5 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          清除篩選
        </button>
      )}
    </div>
  );
}

export default function WikiPageList({
  onNavigate,
  onRefresh,
}: {
  onNavigate?: (tab: string) => void;
  onRefresh: () => void;
}) {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PageFilters>({
    type: "",
    tag: "",
    confidence: "",
  });
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadPages = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.confidence) params.set("confidence", filters.confidence);
    params.set("sort", "updated");
    params.set("order", "desc");

    wiki.pages(params.toString())
      .then((data: any) => {
        if (!cancelled) {
          setPages(data.pages ?? data ?? []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load pages");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filters]);

  useEffect(() => {
    const cancel = loadPages();
    return cancel;
  }, [loadPages]);

  const handleDelete = async (path: string, title: string) => {
    if (!confirm(`Delete "${title || path}"? This cannot be undone.`)) return;
    setDeleting(path);
    try {
      const res = await wiki.deletePage(path);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error((err as any)?.detail ?? `Delete failed (${res.status})`);
      }
      setPages((prev) => prev.filter((p) => p.path !== path));
      if (selectedPath === path) setSelectedPath(null);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete page");
    } finally {
      setDeleting(null);
    }
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const p of pages) {
      for (const t of p.tags) {
        tagSet.add(t);
      }
    }
    return Array.from(tagSet).sort();
  }, [pages]);

  const header = useMemo(
    () => (
      <div className="mb-6 flex items-center gap-2">
        <FileText className="h-5 w-5 text-text-secondary" />
        <h1 className="text-xl font-bold text-text-primary">Wiki Pages</h1>
        {!loading && (
          <span className="text-xs text-text-tertiary">
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
        </div>
      </div>
    ),
    [loading, pages.length],
  );

  const confidenceColor = (level: string) => {
    switch (level) {
      case "high": return "text-green-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-red-400";
      default: return "text-text-tertiary";
    }
  };

  return (
    <div>
      {header}

      <PageFilterBar filters={filters} allTags={allTags} onChange={setFilters} />

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
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1 overflow-x-auto">
            {pages.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-text-tertiary">
                  {filters.type || filters.tag || filters.confidence
                    ? "No pages match the current filters."
                    : "尚無 Wiki 頁面"}
                </p>
                {!filters.type && !filters.tag && !filters.confidence && onNavigate && (
                  <button
                    onClick={() => onNavigate("upload")}
                    className="mt-2 text-xs text-text-secondary hover:text-text-primary transition-colors underline"
                  >
                    前往匯入頁面
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-current/10 text-xs uppercase tracking-wider text-text-tertiary">
                    <th className="pb-2 pr-2 font-medium">Title</th>
                    <th className="pb-2 pr-2 font-medium">Type</th>
                    <th className="hidden pb-2 pr-2 font-medium sm:table-cell">Tags</th>
                    <th className="hidden pb-2 pr-2 font-medium sm:table-cell">Confidence</th>
                    <th className="hidden pb-2 pr-2 font-medium md:table-cell">Created</th>
                    <th className="hidden pb-2 pr-2 font-medium md:table-cell">Updated</th>
                    <th className="pb-2 pr-2 font-medium text-right">Links</th>
                    <th className="pb-2 pl-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr
                      key={page.path}
                      className={`group/row cursor-pointer border-b border-current/5 transition-colors hover:bg-current/5 ${
                        selectedPath === page.path ? "bg-current/10" : ""
                      }`}
                      onClick={() =>
                        setSelectedPath(selectedPath === page.path ? null : page.path)
                      }
                    >
                      <td className="py-2 pr-2 font-medium text-text-primary truncate max-w-[200px]">
                        {page.title || page.path}
                      </td>
                      <td className="py-2 pr-2">
                        <span className="rounded bg-current/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary">
                          {page.type || "—"}
                        </span>
                      </td>
                      <td className="hidden py-2 pr-2 sm:table-cell">
                        <span className="truncate text-xs text-text-secondary">
                          {page.tags.length > 0
                            ? page.tags.slice(0, 3).join(", ")
                            : "—"}
                          {page.tags.length > 3 && " …"}
                        </span>
                      </td>
                      <td className={`hidden py-2 pr-2 sm:table-cell ${confidenceColor(page.confidence)}`}>
                        {page.confidence || "—"}
                      </td>
                      <td className="hidden py-2 pr-2 text-xs text-text-tertiary md:table-cell">
                        {fmtDate(page.created)}
                      </td>
                      <td className="hidden py-2 pr-2 text-xs text-text-tertiary md:table-cell">
                        {fmtDate(page.updated)}
                      </td>
                      <td className="py-2 text-right text-xs text-text-secondary">
                        {page.inbound_link_count ?? page.inboundLinks?.length ?? 0}
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(page.path, page.title);
                          }}
                          disabled={deleting === page.path}
                          className="rounded p-1 text-red-400 opacity-0 transition-opacity hover:bg-red-400/10 group-hover/row:opacity-100"
                          title={`Delete "${page.title || page.path}"`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedPath && (
            <div className="w-full shrink-0 lg:w-96">
              <WikiPageDetail
                pagePath={selectedPath}
                onClose={() => setSelectedPath(null)}
                onDelete={(path) => void handleDelete(path, path)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
