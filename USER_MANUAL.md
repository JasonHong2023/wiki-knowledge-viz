# LLM-Wiki Plugin 使用手冊

> 版本：v2.0（2026-06-29）  
> 對應功能：Overview / Pages / Cards / Mandalart / Tars / Upload / Tags / Graph / GitHub

---

## 目錄

1. [快速入門](#1-快速入門)
2. [介面導覽](#2-介面導覽)
3. [Overview — 知識庫總覽](#3-overview--知識庫總覽)
4. [Pages — Luhmann 索引頁](#4-pages--luhmann-索引頁)
5. [Cards — Hypercard 卡片視圖](#5-cards--hypercard-卡片視圖)
6. [Mandalart — 九宮格思維板](#6-mandalart--九宮格思維板)
7. [Tars — AI 對話助手](#7-tars--ai-對話助手)
8. [Upload — 內容匯入](#8-upload--內容匯入)
9. [Tags — 標籤管理](#9-tags--標籤管理)
10. [Graph — 知識圖譜](#10-graph--知識圖譜)
11. [GitHub — 備份同步](#11-github--備份同步)
12. [快捷鍵與操作提示](#12-快捷鍵與操作提示)
13. [疑難排解](#13-疑難排解)

---

## 1. 快速入門

### 啟動 Wiki

```bash
WIKI_PATH=/your/wiki \
  python -m uvicorn hermes_cli.web_server:app --host 127.0.0.1 --port 9119
```

啟動後在瀏覽器開啟 `http://127.0.0.1:9119`，點選左側選單的 **Wiki** 即可進入。

> 修改任何設定後需按 **Ctrl+Shift+R** 強制刷新瀏覽器快取。

### Wiki 目錄結構

```
$WIKI_PATH/
├── concepts/          ← 所有 Markdown 文章
│   └── my-article.md  ← 每篇文章都在這層（無子目錄）
├── images/            ← 上傳的圖片
├── log.md             ← 匯入記錄（自動維護）
├── tags.yaml          ← 標籤登錄表（自動維護）
└── .mandalart/        ← Mandalart 九宮格資料
    └── boards.json
```

---

## 2. 介面導覽

頂部導航列從左至右依序為：

| 分頁 | 圖示 | 說明 |
|------|------|------|
| Overview | 📖 | 知識庫統計數字與最近活動 |
| Pages | ≡ | Luhmann 編號索引樹（主要瀏覽入口）|
| Cards | ▭ | 卡片格狀視圖 |
| Mandalart | ⊞ | 九宮格思維板 |
| Tars | 🤖 | AI 知識對話助手 |
| Upload | ↑ | 新增內容（URL / 檔案 / 批量）|
| Tags | 🏷 | 標籤瀏覽與管理 |
| Graph | ⟳ | 互動式知識圖譜 |
| GitHub | ⎇ | 備份與同步設定 |

---

## 3. Overview — 知識庫總覽

進入 Wiki 的預設首頁，一眼掌握知識庫狀態。

### 顯示內容

- **統計卡片**：文章總數、標籤總數、最後更新時間
- **類型分布**：entity / concept / comparison / query 四種文章類型佔比圓餅圖
- **最近活動**：按時間排序的最新匯入/更新記錄（最多 20 筆）
- **熱門標籤**：出現頻率最高的標籤雲

### 操作

- 點擊最近活動的任一項目 → 跳轉至 Pages 並開啟該文章詳情
- 點擊任一標籤 → 跳轉至 Tags 並過濾該標籤

---

## 4. Pages — Luhmann 索引頁

**主要的文章瀏覽與管理頁面**，採用 Luhmann Zettelkasten 編號系統組織所有文章。

### Luhmann 編號規則

文章依**主題分類**自動分組，每個分類獲得一個整數編號（1, 2, 3…），分類內的文章獲得小數編號（1.1, 1.2…）：

```
1   AI              ← 分類（9個：AI / 技術 / 程式語言 / API / 概念 / 來源 / 語言 / 格式 / 主題）
  1.1  GPT-4 架構解析     ← 文章
  1.2  Stable Diffusion 原理
2   技術
  2.1  Docker 部署指南
  2.2  Kubernetes 叢集設定
```

> 文章若有多個分類標籤，以**優先順序最高的分類**決定歸屬。分類優先順序：AI > 技術 > 程式語言 > API > 概念 > 來源 > 語言 > 格式 > 主題

### 側邊欄（文章詳情）

點選任一文章後，右側即時顯示詳情面板：

- **基本資訊**：建立/更新時間、文章類型標籤
- **所有標籤**：彩色 pill，可查看分類
- **Frontmatter 預覽**：YAML 元數據一覽
- **內文預覽**：Markdown 渲染後的文章內容
- **入鏈 / 出鏈**：哪些文章連到這篇，這篇連到哪些（雙向 wikilink）

> 進入 Pages 分頁時，側邊欄會**自動開啟最新更新的文章**。
> 
> 要關閉側邊欄，點選右上角的 ✕ 按鈕。

### 工具列操作

```
[搜尋框]  [類型篩選 ▼]  [信心值篩選 ▼]  [全部展開] [全部收合] [↓HTML] [↓JSON] [↺]
```

| 按鈕 | 功能 |
|------|------|
| 搜尋框 | 即時過濾文章標題（支援中英文） |
| 類型篩選 | 按 entity / concept / comparison / query 過濾 |
| 信心值篩選 | 按 high / medium / low 過濾 LLM 分析信心 |
| 全部展開 | 展開所有分類節點 |
| 全部收合 | 收合所有分類節點 |
| ↓ HTML | 匯出目前可見文章為靜態 HTML 檔 |
| ↓ JSON | 匯出目前可見文章為 JSON 資料 |
| ↺ | 重新整理列表 |

### 刪除文章

滑鼠移至任一文章行 → 右側出現 🗑 按鈕 → 點擊後確認刪除。

> 刪除後側邊欄自動切換至下一篇最新文章，不會留白。

---

## 5. Cards — Hypercard 卡片視圖

以卡片格狀排列顯示所有文章，適合快速瀏覽內容摘要。

### 類型篩選

頂部 pill 按鈕過濾文章類型：

| Pill | 顏色 | 文章類型 |
|------|------|----------|
| 全部 | 灰 | 顯示所有 |
| Entity | 藍 | 實體介紹（工具、框架、概念名詞）|
| Concept | 綠 | 概念說明（原理、方法論）|
| Comparison | 黃 | 比較分析（A vs B）|
| Query | 紫 | 問答式筆記（How to…）|

### 卡片互動

- 每張卡片顯示：**標題** + **摘要前 150 字** + **主要標籤**
- 點擊卡片 → 展開顯示完整摘要、所有標籤、文章日期
- 展開後按 **「開啟頁面」** → 跳轉至 Pages 並開啟該文章側邊欄

---

## 6. Mandalart — 九宮格思維板

靈感來自日本九宮格目標管理工具 iMandalart，可建立多個九宮格看板進行思維整理。

### 建立看板

1. 點擊左側「+ 新增看板」按鈕
2. 系統建立一個空白九宮格，標題為「新看板」
3. 點擊標題文字即可重新命名

### 編輯格子

九宮格排列如下，**中央格（紫色邊框）**是核心主題：

```
┌──────┬──────┬──────┐
│  1   │  2   │  3   │
├──────┼──────┼──────┤
│  4   │ 中心 │  5   │
├──────┼──────┼──────┤
│  6   │  7   │  8   │
└──────┴──────┴──────┘
```

- **點擊任一格** → 進入編輯模式（顯示 textarea）
- 輸入內容後 **Ctrl+Enter** 儲存，**Esc** 取消
- 所有格子支援多行文字、換行

### 刪除看板

點擊左側列表中看板名稱旁的 🗑 按鈕 → 確認刪除。

> 刪除操作不可復原，請謹慎使用。

---

## 7. Tars — AI 對話助手

**Tars** 是一個以 Wiki 內容為知識庫的 AI 對話助手，可以回答關於 Wiki 內容的任何問題。

### 工作原理

1. 你的問題 → 關鍵字萃取
2. 對 Wiki 所有文章進行**關鍵字頻率評分**（標題命中 ×3，標籤命中 ×2，內文命中 ×1）
3. 取前 5 篇高分文章作為**上下文（RAG）**
4. 搭配上下文傳送給 LLM 生成回答
5. 回答下方顯示**來源文章引用**，可點擊跳轉閱讀

### 語言設定

點擊標題列右側的 **🌐 語言名稱** 按鈕，選擇回覆語言：

| 選項 | 說明 |
|------|------|
| 自動偵測 | 偵測你提問的語言，用相同語言回答 |
| 繁體中文 | 強制以繁體中文回答 |
| 简体中文 | 強制以简体中文回答 |
| English | 強制以英文回答 |
| 日本語 | 強制以日文回答 |

### 使用技巧

- **問題愈具體，回答愈精確**：「幫我整理 GraphRAG 的優缺點」比「GraphRAG 是什麼」更能帶出深度回答
- **查詢特定文章**：「關於 MCP 的文章裡提到了什麼工具？」
- **跨主題整合**：「AI 和 API 這兩個分類有哪些重疊的文章？」
- **清除對話**：點「清除對話」按鈕重置對話歷史（不影響 Wiki 內容）
- **建議題目**：對話框空白時會顯示 4 個建議提問，點擊直接送出

### 鍵盤操作

- **Enter**：送出訊息
- **Shift+Enter**：換行（不送出）

---

## 8. Upload — 內容匯入

提供三種匯入方式：**URL 匯入**、**檔案上傳**、**批量 URL 匯入**。

### 8.1 URL 匯入

支援三種 URL 類型，自動偵測：

#### YouTube
- 自動抓取**字幕**（繁體中文優先、英文備援）
- 擷取影片標題、頻道名稱、發布日期、縮圖
- 若無字幕則只儲存元數據

#### GitHub
支援三種 GitHub URL 格式：

| URL 格式 | 匯入內容 |
|----------|----------|
| `github.com/user/repo` | 倉庫 README |
| `github.com/user/repo/blob/main/file.md` | 指定檔案內容 |
| `gist.github.com/user/gistid` | Gist 所有檔案 |

#### 一般網頁
- 使用 trafilatura 萃取主文，轉換為 Markdown
- 自動清除 UTM、fbclid 等追蹤參數
- 若 URL 已匯入，提示選擇「覆蓋」或「取消」

#### 操作流程

1. 在文字框貼上 URL
2. 按「匯入」按鈕
3. 後台自動執行分析（語言偵測、標籤萃取、wikilink 建立）
4. 大型內容（>50KB）或 YouTube 顯示分步驟進度條

### 8.2 檔案上傳

支援格式：

| 格式 | 說明 |
|------|------|
| `.md` | 直接解析 Markdown |
| `.pdf` | 使用 PyMuPDF 萃取文字 |
| `.pptx` | 使用 python-pptx 萃取各頁文字 |
| `.xlsx` / `.csv` | 表格轉 Markdown |
| `.png` / `.jpg` / `.jpeg` / `.gif` / `.webp` | OCR 辨識文字（需安裝 tesseract）|

操作：
1. 點擊「選擇檔案」或拖曳檔案至上傳區域
2. 選擇文章類型（auto / entity / concept / comparison / query）
3. 按「上傳」
4. 若已存在同名文章，選擇「覆蓋」或取消

### 8.3 批量 URL 匯入

一次匯入多個 URL：

1. 切換至「批量匯入」分頁
2. 在文字框中每行貼上一個 URL
3. 按「開始批量匯入」
4. 系統逐一處理，每筆顯示狀態：

| 狀態 | 說明 |
|------|------|
| 待處理 | 尚未開始 |
| 處理中 | 正在匯入 |
| 成功 | 匯入完成 |
| 錯誤 | 匯入失敗（顯示錯誤訊息）|
| 衝突 | URL 已存在，等待處理 |

5. 遇到重複 URL 時自動暫停，逐筆選擇「覆蓋」或「跳過」
6. 可隨時按「暫停」中止剩餘任務

### 內容分析管線

每次匯入或上傳後，後台自動執行以下分析：

```
1. 內容萃取（PDF/PPT/圖片 OCR）
2. 語言偵測
3. LLM 標籤分析（規則式 + 語言模型）
4. 更新 Frontmatter（title / type / tags / confidence）
5. 建立雙向 wikilink（共享 ≥2 個標籤的文章自動互連）
```

---

## 9. Tags — 標籤管理

瀏覽和管理所有標籤，了解知識庫的主題分布。

### 標籤分類

系統將所有標籤自動歸入 9 個桶：

| 分類 | 包含範例 |
|------|----------|
| AI | gpt, llm, stable-diffusion, ai, ml |
| 技術 | docker, kubernetes, linux, networking |
| 程式語言 | python, typescript, rust, go |
| API | openai-api, anthropic-api, rest-api |
| 概念 | zettelkasten, graph-theory, rag |
| 來源 | source:github, source:youtube |
| 語言 | zh-TW, english, japanese |
| 格式 | markdown, pdf, json, yaml |
| 主題 | 其他不屬於以上分類的標籤 |

### 操作

- **展開/收合**：點擊分類標題
- **即時搜尋**：頂部搜尋框過濾標籤名稱
- **標籤 pill**：顯示每個標籤的使用次數
- **熱門標籤雲**：頁面底部按使用頻率展示

---

## 10. Graph — 知識圖譜

以**力導向圖（Force-directed Graph）**視覺化文章之間的關聯。

### 圖示意義

| 元素 | 意義 |
|------|------|
| 節點（圓形）| 一篇文章 |
| 節點大小 | 被其他文章引用的次數（越大越重要）|
| 連線 | 兩文章之間有 [[wikilink]] 關係 |
| 連線粗細 | 兩文章共享的標籤數量（越粗關聯越強）|
| 節點顏色 | 文章類型（藍=entity, 綠=concept, 黃=comparison, 紫=query）|

### 互動操作

| 操作 | 效果 |
|------|------|
| 滾輪 | 縮放圖面 |
| 拖曳節點 | 移動節點位置 |
| 點擊節點 | 顯示文章標題和標籤 |
| 點擊標籤 | 跳轉至 Pages 並開啟該文章 |
| 拖曳空白處 | 平移圖面 |

---

## 11. GitHub — 備份同步

將整個 Wiki 備份至 GitHub，並支援從 GitHub 還原。

### 初次設定

1. 前往 GitHub 建立一個**私有倉庫**（建議設為 Private）
2. 建立 **Personal Access Token (PAT)**：
   - GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - 選擇目標倉庫，勾選 Contents 的 Read and Write 權限
3. 在 Wiki GitHub 分頁填入：
   - **Repository URL**：`https://github.com/username/wiki-backup`
   - **Personal Access Token**：貼上 PAT
4. 按「儲存設定」

### 推送備份

1. 填入 Commit message（可留空使用預設訊息）
2. 按「推送到 GitHub」
3. 等待完成提示

### 從 GitHub 還原

1. 按「從 GitHub 還原」
2. 確認警告（**此操作會覆蓋本機 Wiki 內容**）
3. 等待完成

> 還原後需**重啟伺服器**才能看到更新後的內容。

### 自動同步

系統每小時自動推送一次。可在設定頁啟用/停用自動同步。

---

## 12. 快捷鍵與操作提示

### Tars 對話框

| 快捷鍵 | 功能 |
|--------|------|
| Enter | 送出訊息 |
| Shift+Enter | 訊息內換行 |

### Mandalart 格子編輯

| 快捷鍵 | 功能 |
|--------|------|
| Ctrl+Enter | 儲存格子內容 |
| Esc | 取消編輯 |

### 全域

| 快捷鍵 | 功能 |
|--------|------|
| Ctrl+Shift+R | 強制刷新瀏覽器快取（更新後必用）|

---

## 13.疑難排解

### 常見問題

| 問題 | 解法 |
|------|------|
| Wiki 分頁不出現 | 確認 `plugins/llm-wiki/dashboard/dist/index.js` 存在；若無，執行 `cd dashboard && npm run build` |
| 503 Wiki is not configured | 設定 `WIKI_PATH` 環境變數或 `~/.hermes/config.yaml` |
| 匯入失敗（PDF/PPT） | `pip install PyMuPDF python-pptx` |
| OCR 無結果 | `sudo apt install tesseract-ocr tesseract-ocr-chi-tra tesseract-ocr-eng` |
| 頁面顯示舊資料 | 重啟伺服器後按 Ctrl+Shift+R |
| LLM 標籤未生效 | 確認 Hermes 已設定 API key（Settings → LLM Providers）|
| Tars 回覆「找不到相關文章」 | 確認 Wiki 中有文章，且文章有標籤（分析可能尚未完成）|
| Mandalart 資料遺失 | 資料存於 `$WIKI_PATH/.mandalart/boards.json`，確認該路徑可寫入 |
| GitHub 推送失敗 | 確認 PAT 未過期，且對目標倉庫有 Write 權限 |

### 重啟伺服器

```bash
kill -9 $(lsof -i :9119 -t 2>/dev/null) 2>/dev/null; sleep 1
WIKI_PATH=/your/wiki \
  nohup python -m uvicorn hermes_cli.web_server:app \
    --host 127.0.0.1 --port 9119 > /tmp/hermes.log 2>&1 &
echo "Server started"
```

### 查看伺服器日誌

```bash
tail -f /tmp/hermes.log
```

---

## 附錄：文章 Frontmatter 格式

所有 Wiki 文章使用 YAML frontmatter 記錄元數據：

```yaml
---
title: 文章標題
type: concept           # entity | concept | comparison | query
created: 2026-06-27T10:00:00
updated: 2026-06-27T10:00:00
tags:
  - python
  - llm
  - source:github
confidence: high        # high | medium | low（LLM 分析信心值）
---

文章內文（Markdown 格式）...
```

### 標籤命名規則

- 全小寫、用連字號（`-`）連接：`llm-inference`
- 來源標籤加前綴：`source:youtube`、`source:github`、`source:web`
- 語言標籤：`zh-TW`、`english`、`japanese`

---

*由 Claude Code + Hermes Agent 協作撰寫*
