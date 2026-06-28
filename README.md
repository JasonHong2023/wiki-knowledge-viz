# LLM-Wiki Plugin for Hermes

LLM 驅動的個人知識庫，支援網頁/YouTube/GitHub 匯入、標籤管理、知識圖譜、GitHub 備份同步。

---

## 快速安裝

### 方法一：使用安裝腳本（推薦）

```bash
# 複製 plugin 目錄到新 Hermes，並設定 Wiki 路徑
./install.sh /path/to/hermes-agent --wiki-path /your/wiki

# 或：互動式輸入 Wiki 路徑
./install.sh /path/to/hermes-agent
```

腳本會自動完成所有步驟，完成後重啟 Hermes 即可使用。

### 方法二：手動安裝

```bash
# 1. 複製 plugin 到目標 Hermes
cp -r plugins/llm-wiki/ /path/to/hermes-agent/plugins/

# 2. 複製 hermes_cli 支援模組（若目標沒有）
for f in wiki_parser.py wiki_parser_extensions.py content_extractor.py \
          content_tag_analyzer.py language_detector.py \
          tag_registry_updater.py analysis_tracker.py; do
  cp hermes_cli/$f /path/to/hermes-agent/hermes_cli/
done

# 3. 安裝 Python 依賴
pip install -r plugins/llm-wiki/requirements.txt

# 4. 編譯前端
cd plugins/llm-wiki/dashboard
npm install
npm run build

# 5. （可選）寫入 Wiki 路徑到設定檔
# 在 ~/.hermes/config.yaml 加入：
# plugins:
#   wiki:
#     path: /your/wiki
```

---

## 前置需求

| 項目 | 版本要求 | 備註 |
|------|----------|------|
| Python | 3.10+ | |
| Node.js | 18+ | 編譯前端用 |
| npm | 8+ | |
| tesseract-ocr | 任意版本 | **系統套件**，OCR 功能需要 |

### 安裝 tesseract（OCR 支援）

```bash
# Ubuntu / Debian
sudo apt install tesseract-ocr tesseract-ocr-chi-tra tesseract-ocr-eng

# macOS
brew install tesseract tesseract-lang
```

> 若不需要 OCR（圖片上傳辨識文字），可跳過 tesseract。

---

## 設定 Wiki 路徑

Plugin 依序從以下來源讀取 Wiki 路徑（第一個有值者優先）：

1. **環境變數**：`export WIKI_PATH=/your/wiki`
2. **config.yaml**：`~/.hermes/config.yaml`

   ```yaml
   plugins:
     wiki:
       path: /your/wiki
   ```

3. 安裝時透過 `--wiki-path` 參數自動寫入 config.yaml

---

## 啟動 Hermes

```bash
# 方式 A：環境變數帶入（優先）
WIKI_PATH=/your/wiki \
  python -m uvicorn hermes_cli.web_server:app --host 127.0.0.1 --port 9119

# 方式 B：config.yaml 已設定，直接啟動
python -m uvicorn hermes_cli.web_server:app --host 127.0.0.1 --port 9119
```

啟動後開啟瀏覽器 → 點選 **Wiki** 分頁。

> 重啟伺服器後瀏覽器需按 **Ctrl+Shift+R** 強制刷新。

---

## API 端點

Plugin 掛載於 `/api/plugins/llm-wiki/`，主要端點：

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/stats` | Wiki 統計（頁數、標籤數等） |
| GET | `/pages` | 列出所有頁面（支援 type/tag/sort 篩選） |
| GET | `/pages/{path}` | 取得單一頁面內容 |
| DELETE | `/pages/{path}` | 刪除頁面 |
| POST | `/import-url` | 從 URL 匯入（支援 YouTube/GitHub/一般網頁） |
| POST | `/upload` | 上傳檔案（MD/PDF/PPT/Excel/圖片） |
| GET | `/analysis-progress/{task_id}` | 查詢背景分析進度 |
| GET | `/all-tags` | 列出所有標籤（含分類） |
| GET | `/graph` | 知識圖譜節點與連結 |
| GET | `/github/status` | GitHub 同步狀態 |
| POST | `/github/push` | 推送到 GitHub |
| POST | `/github/pull` | 從 GitHub 還原 |

---

## 功能說明

### URL 匯入
- 自動偵測 YouTube / GitHub / 一般網頁
- YouTube：抓取字幕（中文優先、英文備援）、元數據、縮圖
- GitHub：repo README、blob 檔案、gist
- 一般網頁：trafilatura 萃取主文轉 Markdown
- 自動移除 UTM / fbclid 等追蹤參數
- 重複偵測：同 URL 已匯入則提示覆蓋或取消

### 批量匯入
- 貼入多行 URL 一次匯入
- 每筆獨立顯示狀態（pending / processing / success / error / conflict）
- 遇到重複時自動暫停，逐筆選擇「覆蓋」或「跳過」
- 可隨時按「暫停」中止剩餘任務

### 內容分析（自動）
每次匯入或上傳後自動執行：
1. 內容萃取（PDF/PPT/Excel/圖片 OCR）
2. 語言偵測
3. 標籤提取（規則式 + LLM 輔助）
4. 更新 YAML frontmatter（title / type / tags / confidence / created / updated）
5. 自動建立雙向 [[wikilink]]（共享 ≥2 個標籤的頁面）

> 大檔案（>50KB）和 YouTube 匯入為背景任務，前端顯示分步驟進度條。

### 標籤管理
- 9 個自動分類桶：來源 / 語言 / AI / 程式語言 / API / 技術 / 格式 / 概念 / 主題
- 可展開各分類、即時搜尋、彩色標籤 pill
- 熱門標籤雲

### 知識圖譜
- Force-directed 互動圖（節點 = 頁面，連結 = [[wikilink]] 關係）
- 可縮放、拖曳、點擊節點導覽

### GitHub 備份同步
- 設定 Repository URL 和 Personal Access Token（PAT）
- 手動推送（含自訂 commit message）或自動每小時同步
- 支援從 GitHub 還原整個 Wiki

---

## Wiki 目錄結構

Plugin 使用以下目錄結構（首次匯入時自動建立）：

```
$WIKI_PATH/
├── concepts/        ← 所有 Markdown 頁面
├── images/          ← 圖片上傳
├── log.md           ← 匯入記錄（Append-only）
└── tags.yaml        ← 標籤登錄表
```

---

## 更新 Plugin

```bash
cd plugins/llm-wiki

# 修改後端（plugin_api.py）→ 只需重啟伺服器
# 修改前端（dashboard/src/）→ 需重新編譯
cd dashboard && npm run build

# 然後重啟 Hermes 伺服器，瀏覽器 Ctrl+Shift+R
```

---

## 疑難排解

| 問題 | 解法 |
|------|------|
| Wiki tab 不出現 | 確認 `plugins/llm-wiki/dashboard/dist/index.js` 存在 |
| 503 Wiki is not configured | 設定 `WIKI_PATH` 環境變數或 config.yaml |
| 匯入失敗（PDF/PPT） | `pip install PyMuPDF python-pptx` |
| OCR 無結果 | `sudo apt install tesseract-ocr tesseract-ocr-chi-tra` |
| 頁面顯示舊資料 | 重啟伺服器（WikiParser cache）並 Ctrl+Shift+R |
| LLM 標籤未生效 | 確認 Hermes 的 LLM provider 已設定 API key |
