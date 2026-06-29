# LLM-Wiki Plugin 使用手冊

> 版本：v2.1（2026-06-29）  
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
│   └── my-article.md
├── boards/            ← Mandalart AI 版 shadow markdown（供未來 RAG）
│   └── abc123_知識圖譜.md
├── images/            ← 上傳的圖片
├── log.md             ← 匯入記錄（自動維護）
├── tags.yaml          ← 標籤登錄表（自動維護）
└── .mandalart/
    └── boards.json    ← Mandalart 九宮格資料
```

---

## 2. 介面導覽

頂部導航列從左至右依序為：

| 分頁 | 圖示 | 說明 |
|------|------|------|
| Overview | 📖 | 知識庫統計數字與最近活動 |
| Pages | ≡ | Luhmann 編號索引樹（主要瀏覽入口）|
| Cards | ▭ | 卡片格狀視圖 |
| Mandalart | ⊞ | 九宮格思維板（含 AI 自動生成）|
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

---

## 4. Pages — Luhmann 索引頁

**主要的文章瀏覽與管理頁面**，採用 Luhmann Zettelkasten 編號系統組織所有文章。

### Luhmann 編號規則

文章依**主題分類**自動分組：

```
1   AI              ← 分類
  1.1  GPT-4 架構解析
  1.2  Stable Diffusion 原理
2   技術
  2.1  Docker 部署指南
```

> 分類優先順序：AI > 技術 > 程式語言 > API > 概念 > 來源 > 語言 > 格式 > 主題

### 工具列操作

```
[搜尋框]  [類型篩選 ▼]  [信心值篩選 ▼]  [全部展開] [全部收合] [↺]
```

| 按鈕 | 功能 |
|------|------|
| 搜尋框 | 即時過濾文章標題（支援中英文） |
| 類型篩選 | 按 entity / concept / comparison / query 過濾 |
| 信心值篩選 | 按 high / medium / low 過濾 LLM 分析信心 |
| 全部展開/收合 | 展開或收合所有分類節點 |
| ↺ | 重新整理列表 |

### 側邊欄（文章詳情）

點選任一文章後，右側即時顯示：基本資訊、所有標籤、Frontmatter 預覽、內文渲染、入鏈/出鏈。

---

## 5. Cards — Hypercard 卡片視圖

以卡片格狀排列顯示所有文章，適合快速瀏覽內容摘要。

- 頂部 pill 按鈕過濾文章類型：全部 / Entity（藍）/ Concept（綠）/ Comparison（黃）/ Query（紫）
- 點擊卡片展開完整摘要；展開後按「開啟頁面」跳轉至 Pages

---

## 6. Mandalart — 九宮格思維板

提供兩種九宮格來源：**人工填寫** 和 **AI 自動生成**。

### 6.1 兩種堆疊

左側側邊欄頂端有兩個 tab：

| Tab | 圖示 | 說明 |
|-----|------|------|
| 人工 | ✏️ | 手動建立並編輯的看板 |
| AI | 🤖 | 由 LLM 從 Wiki 內容自動生成的看板 |

### 6.2 AI 自動生成

切換到 **AI tab** 後，左側直接顯示所有 Wiki 概念頁面，依主題分組：

| 指示燈 | 意義 |
|--------|------|
| 🟢 綠點 | 該頁面已有 AI 九宮格 |
| ⚫ 灰點 | 尚未生成，點擊即自動生成 |

**點擊任一頁面**：
- 已有看板 → 直接顯示
- 尚未生成 → 顯示旋轉原子動畫，後台以 LLM 綜合相關 Wiki 頁面生成九宮格

**AI 生成原理**：
1. 找出與主題相關的 Wiki 頁面（共享 ≥2 個標籤，或有 wikilink 連結）
2. 彙整最多 6 篇相關頁面的內容
3. LLM 從多篇筆記跨頁合成，為每個面向生成標題 + 3 條說明重點

**AI 看板操作**：

| 按鈕 | 功能 |
|------|------|
| 編輯（複製到人工）| 將此 AI 版本複製一份到人工 tab 供編輯，原 AI 版保留 |
| 重新生成 | 以最新 Wiki 內容重新呼叫 LLM 生成 |
| 匯出 ▼ | 同人工看板，支援 MD / PNG / PPTX / XLSX |

> AI 看板本身**不可直接編輯**。要編輯請先複製到人工堆。

**分類**：AI 看板由 LLM 在生成時自動歸入 5 個分類：

| 分類 | 顏色 |
|------|------|
| AI & 技術 | 藍 |
| 知識管理 | 綠 |
| 規劃執行 | 黃 |
| 個人成長 | 紫 |
| 其他 | 灰 |

### 6.3 人工看板

#### 建立看板

1. 切換至「人工」tab
2. 點擊右上角「+ 新建」按鈕
3. 系統建立空白九宮格，預設標題「新曼陀羅」

#### 編輯格子

中央格（紫色邊框）為核心主題，周圍 8 格為面向：

```
┌──────┬──────┬──────┐
│  1   │  2   │  3   │
├──────┼──────┼──────┤
│  4   │ 核心 │  5   │
├──────┼──────┼──────┤
│  6   │  7   │  8   │
└──────┴──────┴──────┘
```

- **點擊任一格** → 進入編輯模式
- **Ctrl+Enter** 儲存，**Esc** 取消

### 6.4 搜尋

左側側邊欄的搜尋框：

- **人工 tab**：搜尋看板標題或任一格子的內容
- **AI tab**：搜尋 Wiki 頁面標題或路徑
- 點擊 ✕ 清除搜尋

### 6.5 匯出看板

點擊標題列右側 **「匯出 ▼」**：

| 格式 | 副檔名 | 說明 |
|------|--------|------|
| Markdown | `.md` | 含總覽表格 + 各格詳細章節 |
| 圖片 | `.png` | 暗色主題截圖，中心格紫色高亮 |
| PowerPoint | `.pptx` | 單頁投影片，可在 PowerPoint 內編輯 |
| Excel | `.xlsx` | 3×3 儲存格佈局 |

---

## 7. Tars — AI 對話助手

以 Wiki 內容為知識庫的 AI 對話助手。

### 工作原理

1. 你的問題 → 關鍵字萃取
2. 對 Wiki 所有文章進行評分（標題命中 ×3，標籤命中 ×2，內文命中 ×1）
3. **GraphRAG 擴展**：取高分文章的 1-hop wikilink 鄰居補充脈絡
4. 彙整上下文傳給 LLM → 生成回答
5. 回答下方顯示來源文章引用

### 語言設定

點擊標題列右側語言按鈕選擇：自動偵測 / 繁體中文 / 简体中文 / English / 日本語

### 鍵盤操作

| 快捷鍵 | 功能 |
|--------|------|
| Enter | 送出訊息 |
| Shift+Enter | 訊息內換行 |

---

## 8. Upload — 內容匯入

提供三種匯入方式：**URL 匯入**、**檔案上傳**、**批量 URL 匯入**。

### 8.1 URL 匯入

支援三種 URL 類型，自動偵測：

#### YouTube
- 自動抓取字幕（繁體中文優先、英文備援）
- 擷取影片標題、頻道、發布日期

#### GitHub
| URL 格式 | 匯入內容 |
|----------|----------|
| `github.com/user/repo` | 倉庫 README |
| `github.com/user/repo/blob/main/file.md` | 指定檔案 |
| `gist.github.com/user/gistid` | Gist 所有檔案 |

#### 一般網頁

系統採用**兩段式抓取策略**：

```
第一段：直連（20 秒 timeout）
  → 成功 → 正常解析
  → 400/403/429/503 → 加 Referer 重試
  → timeout / SSL error / JS challenge → 進入第二段

第二段：Jina Reader（r.jina.ai）
  → 對方代為 headless render，回傳乾淨 Markdown
  → 支援 CSDN、Medium、Substack、知乎等需要 JS 的網站
```

> 一般情況下使用者無需設定，遇到受保護的網站會自動切換。

### 8.2 檔案上傳

支援格式：

| 格式 | 說明 |
|------|------|
| `.md` / `.markdown` | 直接解析 Markdown |
| `.txt` | 純文字，直接讀取為筆記內容 |
| `.pdf` | 使用 PyMuPDF 萃取文字 |
| `.pptx` | 使用 python-pptx 萃取各頁文字 |
| `.xlsx` | 表格轉 Markdown |
| `.png` / `.jpg` / `.jpeg` / `.gif` / `.webp` | OCR 辨識文字 |

**Type 選單**：

| 選項 | 說明 |
|------|------|
| 自動偵測 | LLM 根據內容決定類型（**預設，建議使用**）|
| Entity | 實體介紹（工具、框架、人物）|
| Concept | 概念說明（原理、方法論）|
| Comparison | 比較分析（A vs B）|
| Query | 問答式筆記 |

### 8.3 批量 URL 匯入

1. 切換至「批量匯入」分頁
2. 每行貼上一個 URL
3. 按「開始批量匯入」，逐筆顯示狀態：

| 狀態 | 說明 |
|------|------|
| 待處理 | 尚未開始 |
| 處理中 | 正在匯入 |
| 成功 | 匯入完成 |
| 錯誤 | 匯入失敗（顯示錯誤訊息）|
| 衝突 | URL 已存在，等待處理 |

4. 遇到重複時暫停，逐筆選擇「覆蓋」或「跳過」
5. 可隨時按「暫停」中止

### 內容分析管線

```
1. 內容萃取（PDF/PPT/TXT/圖片 OCR）
2. 語言偵測
3. LLM 標籤分析（規則式 + 語言模型）
4. 更新 Frontmatter（title / type / tags / confidence）
5. 建立雙向 wikilink（共享 ≥2 個標籤自動互連）
```

---

## 9. Tags — 標籤管理

### 標籤分類（9 個桶）

| 分類 | 範例 |
|------|------|
| AI | gpt, llm, stable-diffusion |
| 技術 | docker, kubernetes, linux |
| 程式語言 | python, typescript, rust |
| API | openai-api, anthropic-api |
| 概念 | zettelkasten, graph-theory, rag |
| 來源 | source:github, source:youtube |
| 語言 | zh-TW, english, japanese |
| 格式 | markdown, pdf, json |
| 主題 | 其他不屬於以上的標籤 |

### 操作

- **展開/收合**：點擊分類標題
- **即時搜尋**：頂部搜尋框過濾標籤名稱

---

## 10. Graph — 知識圖譜

以**力導向圖**視覺化文章關聯。

| 元素 | 意義 |
|------|------|
| 節點大小 | 被引用次數 |
| 連線 | 有 wikilink 關係 |
| 連線粗細 | 共享標籤數量 |
| 節點顏色 | 文章類型（藍/綠/黃/紫）|

| 操作 | 效果 |
|------|------|
| 滾輪 | 縮放 |
| 拖曳節點 | 移動位置 |
| 點擊節點 | 顯示文章資訊 |
| 拖曳空白 | 平移圖面 |

---

## 11. GitHub — 備份同步

### 初次設定

1. 在 GitHub 建立私有倉庫
2. 建立 Fine-grained PAT（Contents Read+Write 權限）
3. 在 Wiki GitHub 分頁填入 Repository URL + PAT → 儲存

### 推送 / 還原

- **推送**：填入 commit message → 按「推送到 GitHub」
- **還原**：按「從 GitHub 還原」（**會覆蓋本機內容，不可復原**）

---

## 12. 快捷鍵與操作提示

| 快捷鍵 | 功能 |
|--------|------|
| **Ctrl+Shift+R** | 強制刷新瀏覽器快取（更新後必用）|
| Enter | Tars 送出訊息 |
| Shift+Enter | Tars 訊息內換行 |
| Ctrl+Enter | Mandalart 格子儲存 |
| Esc | Mandalart 格子取消編輯 |

---

## 13. 疑難排解

| 問題 | 解法 |
|------|------|
| Wiki 分頁不出現 | 確認 `plugins/llm-wiki/dashboard/dist/index.js` 存在；若無，執行 `cd dashboard && npm run build` |
| 503 Wiki is not configured | 設定 `WIKI_PATH` 環境變數或 `~/.hermes/config.yaml` |
| 匯入失敗（PDF/PPT） | `pip install PyMuPDF python-pptx` |
| OCR 無結果 | `sudo apt install tesseract-ocr tesseract-ocr-chi-tra` |
| 頁面顯示舊資料 | 重啟伺服器後按 Ctrl+Shift+R |
| LLM 標籤未生效 | 確認 Hermes 已設定 API key（Settings → LLM Providers）|
| URL 匯入失敗（CSDN / Medium 等）| 系統會自動改用 Jina Reader，若仍失敗可能是 Jina 本身無法訪問，請檢查網路連線 |
| Mandalart AI 生成 500 | LLM 回應格式問題，點「重新生成」重試；若持續失敗請檢查 `/tmp/hermes.log` |
| AI 九宮格格子部分空白 | 正常現象（LLM 未能填滿 8 格），點重新生成可能填補 |
| GitHub 推送失敗 | 確認 PAT 未過期，且有 Contents Write 權限 |

### 重啟伺服器

```bash
kill -9 $(lsof -i :9119 -t 2>/dev/null) 2>/dev/null; sleep 1
WIKI_PATH=/your/wiki \
  nohup python -m uvicorn hermes_cli.web_server:app \
    --host 127.0.0.1 --port 9119 > /tmp/hermes.log 2>&1 &
```

---

## 附錄：文章 Frontmatter 格式

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
confidence: high        # high | medium | low
---
```

---

*由 Claude Code + Hermes Agent 協作撰寫*
