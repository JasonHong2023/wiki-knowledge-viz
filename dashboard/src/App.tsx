import { useState, useEffect } from "react";
import { BookOpen, Upload, Tags, Share2, Github, CreditCard, ListTree, Grid3x3, Bot } from "lucide-react";
import WikiOverview from "./pages/WikiOverview";
import WikiCards from "./pages/WikiCards";
import WikiIndex from "./pages/WikiIndex";
import WikiMandalart from "./pages/WikiMandalart";
import WikiTars from "./pages/WikiTars";
import WikiUpload from "./pages/WikiUpload";
import WikiTags from "./pages/WikiTags";
import WikiGraph from "./pages/WikiGraph";
import WikiGitHub from "./pages/WikiGitHub";
import "./wiki.css";

type Tab = "overview" | "cards" | "index" | "mandalart" | "tars" | "upload" | "tags" | "graph" | "github";

const TABS = [
  { id: "overview"  as Tab, label: "Overview",  Icon: BookOpen },
  { id: "index"     as Tab, label: "Pages",     Icon: ListTree },
  { id: "cards"     as Tab, label: "Cards",     Icon: CreditCard },
  { id: "mandalart" as Tab, label: "Mandalart", Icon: Grid3x3 },
  { id: "tars"      as Tab, label: "Tars",      Icon: Bot },
  { id: "upload"    as Tab, label: "Upload",    Icon: Upload },
  { id: "tags"      as Tab, label: "Tags",      Icon: Tags },
  { id: "graph"     as Tab, label: "Graph",     Icon: Share2 },
  { id: "github"    as Tab, label: "GitHub",    Icon: Github },
];

function getInitialTab(): Tab {
  try {
    const hash = window.location.hash.replace("#wiki/", "");
    if (TABS.some((t) => t.id === hash)) return hash as Tab;
    // legacy "pages" hash → redirect to "index"
    if (hash === "pages") return "index";
  } catch {}
  return "overview";
}

export default function App() {
  const [tab, setTab] = useState<Tab>(getInitialTab());
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() { setRefreshKey((k) => k + 1); }

  function navigate(t: Tab, _path?: string) {
    setTab(t);
    try { window.location.hash = `wiki/${t}`; } catch {}
  }

  useEffect(() => {
    const onHash = () => {
      try {
        const hash = window.location.hash.replace("#wiki/", "");
        if (hash === "pages") { setTab("index"); return; }
        if (TABS.some((t) => t.id === hash)) setTab(hash as Tab);
      } catch {}
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="wiki-plugin">
      <nav className="wiki-nav">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={"wiki-nav-btn" + (tab === id ? " active" : "")}
            onClick={() => navigate(id)}
          >
            <Icon style={{ width: 16, height: 16 }} />
            {label}
          </button>
        ))}
      </nav>
      <div className="wiki-page" key={refreshKey}>
        {tab === "overview"  && <WikiOverview onNavigate={navigate} />}
        {tab === "index"     && <WikiIndex onRefresh={refresh} />}
        {tab === "cards"     && <WikiCards onNavigate={navigate} />}
        {tab === "mandalart" && <WikiMandalart />}
        {tab === "tars"      && <WikiTars onNavigate={navigate} />}
        {tab === "upload"    && <WikiUpload onRefresh={refresh} />}
        {tab === "tags"      && <WikiTags />}
        {tab === "graph"     && <WikiGraph />}
        {tab === "github"    && <WikiGitHub />}
      </div>
    </div>
  );
}
