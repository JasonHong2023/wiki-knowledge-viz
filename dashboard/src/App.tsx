import { useState, useEffect } from "react";
import { BookOpen, FileText, Upload, Tags, Share2, Github } from "lucide-react";
import WikiOverview from "./pages/WikiOverview";
import WikiPageList from "./pages/WikiPageList";
import WikiUpload from "./pages/WikiUpload";
import WikiTags from "./pages/WikiTags";
import WikiGraph from "./pages/WikiGraph";
import WikiGitHub from "./pages/WikiGitHub";

type Tab = "overview" | "pages" | "upload" | "tags" | "graph" | "github";

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", Icon: BookOpen },
  { id: "pages", label: "Pages", Icon: FileText },
  { id: "upload", label: "Upload", Icon: Upload },
  { id: "tags", label: "Tags", Icon: Tags },
  { id: "graph", label: "Graph", Icon: Share2 },
  { id: "github", label: "GitHub", Icon: Github },
];

function getInitialTab(): Tab {
  const hash = window.location.hash.replace("#wiki/", "");
  if (TABS.some((t) => t.id === hash)) return hash as Tab;
  return "overview";
}

export default function App() {
  const [tab, setTab] = useState<Tab>(getInitialTab);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  function navigate(t: Tab) {
    setTab(t);
    window.location.hash = `wiki/${t}`;
  }

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace("#wiki/", "");
      if (TABS.some((t) => t.id === hash)) setTab(hash as Tab);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-0 pb-8">
      {/* Tab Nav */}
      <nav className="mb-6 flex gap-1 border-b border-current/10">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
              tab === id
                ? "border-text-primary text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Page Content */}
      <div key={refreshKey}>
        {tab === "overview" && <WikiOverview onNavigate={navigate} />}
        {tab === "pages" && <WikiPageList onNavigate={navigate} onRefresh={refresh} />}
        {tab === "upload" && <WikiUpload onRefresh={refresh} />}
        {tab === "tags" && <WikiTags />}
        {tab === "graph" && <WikiGraph />}
        {tab === "github" && <WikiGitHub />}
      </div>
    </div>
  );
}
