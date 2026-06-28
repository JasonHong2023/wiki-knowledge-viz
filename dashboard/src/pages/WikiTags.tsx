import { useEffect, useMemo, useState } from "react";
import { Tags, Hash, Loader2, ChevronDown, ChevronRight, Search } from "lucide-react";
import { wiki } from "../api";

interface AllTagInfo {
  name: string;
  count: number;
  category?: string;
}

// Category display order and labels
const CATEGORY_ORDER = ["來源", "語言", "AI", "程式語言", "API", "技術", "格式", "概念", "主題"];

const CATEGORY_COLORS: Record<string, string> = {
  "來源":    "bg-blue-400/15 text-blue-300 border-blue-400/20",
  "語言":    "bg-purple-400/15 text-purple-300 border-purple-400/20",
  "AI":      "bg-pink-400/15 text-pink-300 border-pink-400/20",
  "程式語言": "bg-cyan-400/15 text-cyan-300 border-cyan-400/20",
  "API":     "bg-orange-400/15 text-orange-300 border-orange-400/20",
  "技術":    "bg-green-400/15 text-green-300 border-green-400/20",
  "格式":    "bg-yellow-400/15 text-yellow-300 border-yellow-400/20",
  "概念":    "bg-indigo-400/15 text-indigo-300 border-indigo-400/20",
  "主題":    "bg-current/10 text-text-secondary border-current/10",
};

function tagColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS["主題"];
}

// ── Tag pill ────────────────────────────────────────────────────────────
function TagPill({ tag, category }: { tag: AllTagInfo; category: string }) {
  const maxCount = 20;
  const scale = Math.max(0.75, Math.min(1.25, 0.75 + (tag.count / maxCount) * 0.5));
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-90 ${tagColor(category)}`}
      style={{ fontSize: `${Math.round(scale * 12)}px` }}
    >
      {tag.name}
      <span className="opacity-60 text-[10px]">{tag.count}</span>
    </span>
  );
}

// ── Collapsible category section ────────────────────────────────────────
function CategorySection({
  name,
  tags,
  defaultOpen,
}: {
  name: string;
  tags: AllTagInfo[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const total = tags.reduce((s, t) => s + t.count, 0);

  return (
    <div className="rounded-lg border border-current/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-current/[0.03] transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-text-tertiary shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
        )}
        <span className="text-sm font-medium text-text-primary">{name}</span>
        <span className="ml-1 rounded-full bg-current/10 px-2 py-0.5 text-[11px] text-text-tertiary">
          {tags.length} 個標籤
        </span>
        <span className="ml-auto text-xs text-text-tertiary">{total} 次使用</span>
      </button>

      {open && (
        <div className="flex flex-wrap gap-1.5 border-t border-current/5 bg-current/[0.015] px-4 py-3">
          {tags.map((tag) => (
            <TagPill key={tag.name} tag={tag} category={name} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
export default function WikiTags() {
  const [allTags, setAllTags] = useState<AllTagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function load() {
    let cancelled = false;
    setLoading(true);
    setError(null);
    wiki.allTags()
      .then((data: AllTagInfo[]) => {
        if (!cancelled) { setAllTags(data); setLoading(false); }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tags");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }

  useEffect(() => {
    const cancel = load();
    return cancel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { grouped, stats } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? allTags.filter((t) => t.name.toLowerCase().includes(q)) : allTags;

    const buckets: Record<string, AllTagInfo[]> = {};
    for (const tag of filtered) {
      const cat = tag.category ?? "主題";
      (buckets[cat] ??= []).push(tag);
    }
    // Sort tags within each group by count desc
    for (const cat of Object.keys(buckets)) {
      buckets[cat].sort((a, b) => b.count - a.count);
    }

    // Order groups
    const ordered: Array<{ name: string; tags: AllTagInfo[] }> = [];
    for (const name of CATEGORY_ORDER) {
      if (buckets[name]?.length) ordered.push({ name, tags: buckets[name] });
    }
    // Any extra categories not in CATEGORY_ORDER
    for (const [name, tags] of Object.entries(buckets)) {
      if (!CATEGORY_ORDER.includes(name)) ordered.push({ name, tags });
    }

    const totalUsage = allTags.reduce((s, t) => s + t.count, 0);
    return {
      grouped: ordered,
      stats: {
        unique: allTags.length,
        totalUsage,
        categories: Object.keys(buckets).length,
      },
    };
  }, [allTags, search]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Tags className="h-5 w-5 text-text-secondary" />
        <h1 className="text-xl font-bold text-text-primary">Tag Manager</h1>
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
        <>
          {/* Stats row */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-current/10 bg-current/[0.03] p-4">
              <p className="text-xs text-text-tertiary mb-1">唯一標籤</p>
              <p className="text-2xl font-semibold text-text-primary">{stats.unique}</p>
            </div>
            <div className="rounded-lg border border-current/10 bg-current/[0.03] p-4">
              <p className="text-xs text-text-tertiary mb-1">總使用次數</p>
              <p className="text-2xl font-semibold text-text-primary">{stats.totalUsage}</p>
            </div>
            <div className="rounded-lg border border-current/10 bg-current/[0.03] p-4">
              <p className="text-xs text-text-tertiary mb-1">分類數</p>
              <p className="text-2xl font-semibold text-text-primary">{stats.categories}</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋標籤…"
              className="w-full rounded-md border border-current/20 bg-current/5 pl-9 pr-3 py-2 text-sm text-text-primary outline-none focus:border-current/40 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category legend */}
          {!search && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {grouped.map(({ name }) => (
                <span
                  key={name}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tagColor(name)}`}
                >
                  {name}
                </span>
              ))}
            </div>
          )}

          {/* Grouped sections */}
          {grouped.length === 0 ? (
            <p className="text-sm text-text-tertiary py-8 text-center">
              {search ? `找不到包含「${search}」的標籤` : "尚無標籤"}
            </p>
          ) : (
            <div className="space-y-2">
              {grouped.map(({ name, tags }, i) => (
                <CategorySection
                  key={name}
                  name={name}
                  tags={tags}
                  defaultOpen={i < 4}
                />
              ))}
            </div>
          )}

          {/* Top tags mini cloud — show only when not searching */}
          {!search && allTags.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4 text-text-tertiary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                  熱門標籤
                </h2>
              </div>
              <div className="rounded-lg border border-current/10 bg-current/[0.03] p-4 flex flex-wrap gap-2">
                {[...allTags]
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 40)
                  .map((tag) => (
                    <TagPill key={tag.name} tag={tag} category={tag.category ?? "主題"} />
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
