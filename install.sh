#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LLM-Wiki Plugin Installer
#
# Usage:
#   ./install.sh                          # 安裝到 ~/.hermes/hermes-agent（預設）
#   ./install.sh /path/to/hermes-agent    # 安裝到指定的 hermes-agent 目錄
#   ./install.sh --wiki-path /my/wiki     # 同時寫入 WIKI_PATH 到 config.yaml
#
# 功能：
#   1. 複製 plugin 目錄到目標 Hermes
#   2. 複製 hermes_cli wiki 支援模組（若目標缺少）
#   3. pip install 依賴套件
#   4. npm install + build 前端 bundle
#   5. 可選：寫入 WIKI_PATH 到 ~/.hermes/config.yaml
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── 顏色輸出 ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 來源目錄（本腳本所在處） ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_HERMES="$(cd "$SCRIPT_DIR/../.." && pwd)"   # plugins/llm-wiki → hermes-agent

# ── 解析參數 ──────────────────────────────────────────────────────────────────
TARGET_HERMES="${HOME}/.hermes/hermes-agent"
WIKI_PATH_ARG=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --wiki-path)
            WIKI_PATH_ARG="$2"; shift 2 ;;
        --wiki-path=*)
            WIKI_PATH_ARG="${1#*=}"; shift ;;
        -*)
            error "未知選項: $1" ;;
        *)
            TARGET_HERMES="$1"; shift ;;
    esac
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "   LLM-Wiki Plugin Installer"
echo "═══════════════════════════════════════════════════════"
echo ""
info "來源：$SOURCE_HERMES"
info "目標：$TARGET_HERMES"
[[ -n "$WIKI_PATH_ARG" ]] && info "WIKI_PATH：$WIKI_PATH_ARG"
echo ""

# ── 確認目標是有效的 hermes-agent ─────────────────────────────────────────────
[[ -d "$TARGET_HERMES" ]] || error "目標目錄不存在：$TARGET_HERMES"
[[ -f "$TARGET_HERMES/hermes_cli/web_server.py" ]] || \
    error "目標看起來不是 hermes-agent（找不到 hermes_cli/web_server.py）"

# ── 是否安裝到同一個目錄（自己安裝自己） ──────────────────────────────────────
IS_SELF_INSTALL=false
[[ "$(realpath "$TARGET_HERMES")" == "$(realpath "$SOURCE_HERMES")" ]] && IS_SELF_INSTALL=true

# ── 檢查前置工具 ──────────────────────────────────────────────────────────────
info "檢查前置工具..."
for cmd in python3 pip node npm; do
    command -v "$cmd" &>/dev/null || error "找不到指令：$cmd（請先安裝）"
done
ok "前置工具齊全"

# ── 步驟 1：複製 plugin 目錄 ──────────────────────────────────────────────────
echo ""
info "步驟 1／5：複製 plugin 目錄..."

TARGET_PLUGIN="$TARGET_HERMES/plugins/llm-wiki"
mkdir -p "$TARGET_HERMES/plugins"

if [[ "$IS_SELF_INSTALL" == "true" ]]; then
    ok "自身安裝，跳過 plugin 目錄複製"
else
    if [[ -d "$TARGET_PLUGIN" ]]; then
        warn "目標已存在 plugins/llm-wiki/，將覆蓋更新"
        # 保留 dist/ 避免不必要重建（稍後會重建所以無所謂）
    fi
    # 排除 node_modules、dist（稍後重建）、__pycache__
    rsync -a --delete \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        "$SCRIPT_DIR/" "$TARGET_PLUGIN/"
    ok "plugin 目錄複製完成 → $TARGET_PLUGIN"
fi

# ── 步驟 2：複製 hermes_cli 支援模組 ─────────────────────────────────────────
echo ""
info "步驟 2／5：檢查 hermes_cli wiki 支援模組..."

SUPPORT_MODULES=(
    wiki_parser.py
    wiki_parser_extensions.py
    content_extractor.py
    content_tag_analyzer.py
    language_detector.py
    tag_registry_updater.py
    analysis_tracker.py
)

SRC_CLI="$SOURCE_HERMES/hermes_cli"
DST_CLI="$TARGET_HERMES/hermes_cli"
COPIED_COUNT=0

for mod in "${SUPPORT_MODULES[@]}"; do
    src="$SRC_CLI/$mod"
    dst="$DST_CLI/$mod"
    if [[ ! -f "$src" ]]; then
        warn "來源找不到 $mod，跳過"
        continue
    fi
    if [[ "$IS_SELF_INSTALL" == "true" ]]; then
        ok "$mod 已在目標（自身安裝）"
        continue
    fi
    if [[ -f "$dst" ]]; then
        # 僅在來源較新時覆蓋
        if [[ "$src" -nt "$dst" ]]; then
            cp "$src" "$dst"
            ok "更新 hermes_cli/$mod"
            ((COPIED_COUNT++))
        else
            ok "hermes_cli/$mod 已是最新"
        fi
    else
        cp "$src" "$dst"
        ok "複製 hermes_cli/$mod"
        ((COPIED_COUNT++))
    fi
done

[[ $COPIED_COUNT -gt 0 ]] && info "共複製 $COPIED_COUNT 個 hermes_cli 模組" || true

# ── 步驟 3：pip install ────────────────────────────────────────────────────────
echo ""
info "步驟 3／5：安裝 Python 依賴套件..."

REQ="$TARGET_PLUGIN/requirements.txt"
[[ -f "$REQ" ]] || error "找不到 requirements.txt：$REQ"

pip install -r "$REQ" --quiet && ok "pip install 完成" || {
    warn "pip install 有部分警告，請手動確認："
    pip install -r "$REQ"
}

# 系統套件提醒（tesseract-ocr）
if ! command -v tesseract &>/dev/null; then
    warn "未偵測到 tesseract-ocr（OCR 功能需要）"
    warn "Ubuntu/Debian：sudo apt install tesseract-ocr tesseract-ocr-chi-tra"
    warn "macOS：        brew install tesseract tesseract-lang"
fi

# ── 步驟 4：npm install + build ───────────────────────────────────────────────
echo ""
info "步驟 4／5：編譯前端 bundle..."

DASHBOARD="$TARGET_PLUGIN/dashboard"
[[ -d "$DASHBOARD" ]] || error "找不到 dashboard 目錄：$DASHBOARD"

cd "$DASHBOARD"

if [[ ! -d "node_modules" ]]; then
    info "執行 npm install..."
    npm install --silent && ok "npm install 完成"
else
    info "node_modules 已存在，跳過 npm install"
    info "（如需更新依賴請手動執行：cd $DASHBOARD && npm install）"
fi

info "執行 npm run build..."
npm run build 2>&1 | grep -v "^>" | grep -v "^$" || true

[[ -f "$DASHBOARD/dist/index.js" ]] && ok "前端 bundle 編譯完成" || \
    error "編譯失敗：$DASHBOARD/dist/index.js 不存在"

# ── 步驟 5：設定 WIKI_PATH（可選） ────────────────────────────────────────────
echo ""
info "步驟 5／5：設定 WIKI_PATH..."

HERMES_CONFIG="${HOME}/.hermes/config.yaml"

set_wiki_path() {
    local path="$1"
    mkdir -p "$(dirname "$HERMES_CONFIG")"
    if [[ ! -f "$HERMES_CONFIG" ]]; then
        printf "plugins:\n  wiki:\n    path: %s\n" "$path" > "$HERMES_CONFIG"
        ok "建立 config.yaml，寫入 WIKI_PATH=$path"
    else
        # 用 python3 安全地更新 YAML
        python3 - "$HERMES_CONFIG" "$path" <<'PYEOF'
import sys, yaml, pathlib

cfg_path, wiki_path = pathlib.Path(sys.argv[1]), sys.argv[2]
cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
plugins = cfg.setdefault("plugins", {})
wiki = plugins.setdefault("wiki", {})
wiki["path"] = wiki_path
cfg_path.write_text(yaml.dump(cfg, allow_unicode=True, default_flow_style=False), encoding="utf-8")
print(f"已更新 {cfg_path}：plugins.wiki.path = {wiki_path}")
PYEOF
        ok "config.yaml 已更新"
    fi
}

if [[ -n "$WIKI_PATH_ARG" ]]; then
    set_wiki_path "$WIKI_PATH_ARG"
elif [[ -z "${WIKI_PATH:-}" ]]; then
    echo ""
    echo "  WIKI_PATH 未設定。你可以："
    echo "  A. 手動設定環境變數：export WIKI_PATH=/your/wiki"
    echo "  B. 寫入 config.yaml（重啟後自動生效）："
    echo "     plugins:"
    echo "       wiki:"
    echo "         path: /your/wiki"
    echo "  C. 安裝時帶入：./install.sh --wiki-path /your/wiki"
    echo ""
    if [[ -t 0 ]]; then
        read -r -p "  輸入 Wiki 目錄路徑（Enter 跳過）: " user_path
        if [[ -n "$user_path" ]]; then
            set_wiki_path "$user_path"
        else
            warn "跳過 WIKI_PATH 設定，請記得在啟動前設定"
        fi
    else
        warn "非互動模式，跳過 WIKI_PATH 設定"
        warn "請執行：./install.sh --wiki-path /your/wiki"
    fi
else
    ok "WIKI_PATH 已設定（環境變數）：$WIKI_PATH"
fi

# ── 完成 ────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "   ${GREEN}安裝完成！${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  啟動 Hermes 伺服器："
echo ""
echo "  WIKI_PATH=/your/wiki \\"
echo "    python -m uvicorn hermes_cli.web_server:app \\"
echo "    --host 127.0.0.1 --port 9119"
echo ""
echo "  Plugin API：http://127.0.0.1:9119/api/plugins/llm-wiki/stats"
echo "  Wiki 頁面：  http://127.0.0.1:9119（點 Wiki tab）"
echo ""
