import { useState, useEffect, useCallback } from "react";
import {
  Github,
  Upload,
  Download,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";
import { github } from "../api";

interface Change {
  status: "added" | "modified" | "deleted" | "untracked" | "renamed" | string;
  path: string;
}

interface GithubStatus {
  configured: boolean;
  repo_url: string;
  branch: string;
  auto_sync: string;
  is_git_repo: boolean;
  changes: Change[];
  last_commit: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  added: "新增",
  modified: "修改",
  deleted: "刪除",
  untracked: "新增",
  renamed: "重新命名",
};

const STATUS_COLORS: Record<string, string> = {
  added: "text-green-400",
  modified: "text-yellow-400",
  deleted: "text-red-400",
  untracked: "text-green-400",
  renamed: "text-blue-400",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-mono ${STATUS_COLORS[status] ?? "text-text-tertiary"}`}>
      [{STATUS_LABELS[status] ?? status}]
    </span>
  );
}

export default function WikiGitHub() {
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"push" | "pull" | "save" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Config form state
  const [repoUrl, setRepoUrl] = useState("");
  const [pat, setPat] = useState("");
  const [branch, setBranch] = useState("main");
  const [autoSync, setAutoSync] = useState("off");
  const [showPat, setShowPat] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data: GithubStatus = await github.status();
      setStatus(data);
      if (!repoUrl && data.repo_url) setRepoUrl(data.repo_url);
      if (!branch && data.branch) setBranch(data.branch);
      if (data.auto_sync) setAutoSync(data.auto_sync);
      if (!data.configured) setSettingsOpen(true);
    } catch (e) {
      setMessage({ type: "error", text: String(e) });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveConfig = async () => {
    setActionLoading("save");
    try {
      const data = await github.saveConfig({ repo_url: repoUrl, pat, branch, auto_sync: autoSync });
      showMsg("success", data.message ?? "設定已儲存");
      setSettingsOpen(false);
      await fetchStatus();
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePush = async () => {
    setActionLoading("push");
    try {
      const data = await github.push({ message: commitMsg });
      showMsg("success", data.message ?? "上傳成功");
      setCommitMsg("");
      await fetchStatus();
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePull = async () => {
    if (!confirm("確定要從 GitHub 還原嗎？本機的未提交變更將會被覆蓋。")) return;
    setActionLoading("pull");
    try {
      const data = await github.pull();
      showMsg("success", data.message ?? "還原成功");
      await fetchStatus();
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5 text-text-secondary" />
          <h1 className="text-lg font-semibold">GitHub 同步</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchStatus()}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新整理
          </button>
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors border border-current/10"
          >
            <Settings className="h-3.5 w-3.5" />
            設定
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-start gap-2 rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          {message.text}
        </div>
      )}

      {/* Settings Panel */}
      {settingsOpen && (
        <div className="rounded-lg border border-current/10 bg-current/5 p-4 space-y-4">
          <h2 className="text-sm font-medium text-text-secondary">GitHub 設定</h2>

          <div className="grid gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Repository URL</label>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/your-username/your-wiki"
                className="w-full rounded border border-current/20 bg-current/5 px-3 py-2 text-sm outline-none focus:border-current/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1">Personal Access Token (PAT)</label>
              <div className="relative">
                <input
                  type={showPat ? "text" : "password"}
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded border border-current/20 bg-current/5 px-3 py-2 pr-9 text-sm outline-none focus:border-current/40 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPat((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                >
                  {showPat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-text-tertiary">
                在 GitHub → Settings → Developer settings → Personal access tokens 產生，需勾選 <code>repo</code> 權限
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-tertiary mb-1">分支</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full rounded border border-current/20 bg-current/5 px-3 py-2 text-sm outline-none focus:border-current/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-text-tertiary mb-1">自動同步</label>
                <select
                  value={autoSync}
                  onChange={(e) => setAutoSync(e.target.value)}
                  className="w-full rounded border border-current/20 bg-current/5 px-3 py-2 text-sm outline-none focus:border-current/40 transition-colors"
                >
                  <option value="off">關閉</option>
                  <option value="hourly">每小時自動上傳</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setSettingsOpen(false)}
              className="rounded px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => void handleSaveConfig()}
              disabled={actionLoading === "save"}
              className="flex items-center gap-1.5 rounded bg-midground/20 px-3 py-1.5 text-sm hover:bg-midground/30 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "save" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              儲存設定
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        </div>
      ) : !status?.configured ? (
        <div className="rounded-lg border border-current/10 p-8 text-center space-y-2">
          <Github className="h-10 w-10 mx-auto text-text-tertiary/40" />
          <p className="text-sm text-text-secondary">尚未設定 GitHub 同步</p>
          <p className="text-xs text-text-tertiary">請點選右上角「設定」填入 Repository URL 和 PAT</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="rounded-lg border border-current/10 bg-current/5 p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <Github className="h-4 w-4" />
                <span className="font-mono text-xs">{status.repo_url}</span>
                <span className="text-text-tertiary">/{status.branch}</span>
              </div>
              {status.auto_sync === "hourly" && (
                <div className="flex items-center gap-1 text-xs text-text-tertiary">
                  <Clock className="h-3.5 w-3.5" />
                  每小時自動同步
                </div>
              )}
            </div>
            {status.last_commit && (
              <p className="mt-1.5 text-xs text-text-tertiary">
                上次提交：{status.last_commit}
              </p>
            )}
          </div>

          {/* Changes Preview */}
          <div className="rounded-lg border border-current/10 bg-current/5">
            <div className="border-b border-current/10 px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-medium">本機變更</span>
              <span className="text-xs text-text-tertiary">
                {status.changes.length > 0
                  ? `${status.changes.length} 個檔案待上傳`
                  : "已是最新版本"}
              </span>
            </div>

            {status.changes.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto text-green-400/60 mb-1.5" />
                <p className="text-sm text-text-tertiary">沒有待上傳的變更</p>
              </div>
            ) : (
              <ul className="divide-y divide-current/5 max-h-60 overflow-y-auto">
                {status.changes.map((change, i) => (
                  <li key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <Badge status={change.status} />
                    <span className="font-mono text-xs text-text-secondary truncate">{change.path}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Commit Message */}
          <div>
            <label className="block text-xs text-text-tertiary mb-1">提交訊息（選填）</label>
            <input
              type="text"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder={`Hermes sync ${new Date().toLocaleString("zh-TW")}`}
              className="w-full rounded border border-current/20 bg-current/5 px-3 py-2 text-sm outline-none focus:border-current/40 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => void handlePush()}
              disabled={actionLoading !== null || status.changes.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-current/20 bg-current/5 px-4 py-3 text-sm font-medium hover:bg-current/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === "push" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              上傳到 GitHub
            </button>

            <button
              onClick={() => void handlePull()}
              disabled={actionLoading !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-current/20 bg-current/5 px-4 py-3 text-sm font-medium hover:bg-current/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === "pull" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              從 GitHub 還原
            </button>
          </div>

          <p className="text-xs text-text-tertiary text-center">
            還原時以 GitHub 為準，本機未上傳的變更將被覆蓋
          </p>
        </div>
      )}
    </div>
  );
}
